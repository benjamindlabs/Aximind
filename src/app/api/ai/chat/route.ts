import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { toolDefinitions, toolHandlers as importedToolHandlers } from '@/lib/ai/tools'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Tool handlers with snake_case to camelCase support
const toolHandlers: Record<string, (args: any) => Promise<any>> = new Proxy(importedToolHandlers as any, {
  get(target, prop: string) {
    if (prop in target) return target[prop]
    const camelCaseProp = prop.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    return target[camelCaseProp]
  }
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, conversationId, history } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Build message history
    const chatHistory: Groq.Chat.ChatCompletionMessageParam[] = (history || []).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }))

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...chatHistory,
      { role: 'user', content: message },
    ]

    // Track tool calls for saving
    let toolCallsMade: { name: string; args: any; result: any }[] = []
    let iterations = 0
    const maxIterations = 5

    // Tool calling loop
    while (iterations < maxIterations) {
      let response;
      try {
        response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages,
          tools: toolDefinitions,
          tool_choice: 'auto',
          max_tokens: 1024,
        })
      } catch (err: any) {
        // Groq occasionally fails to parse its own model's tool calls (tool_use_failed)
        if (err?.error?.error?.code === 'tool_use_failed' || (err.message && err.message.includes('tool_use_failed'))) {
          messages.push({
            role: 'system',
            content: 'Your last tool call failed with a syntax error. Please try calling the tool again with correct syntax.'
          });
          iterations++;
          continue;
        }
        throw err;
      }

      const assistantMsg = response.choices[0].message
      messages.push(assistantMsg)

      // No tool calls - return final response
      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        const finalReply = assistantMsg.content || 'Done.'

        // Save to database
        if (conversationId) {
          await supabase.from('ai_messages').insert([
            { conversation_id: conversationId, role: 'user', content: message },
            { conversation_id: conversationId, role: 'assistant', content: finalReply, tool_calls: toolCallsMade },
          ])
          await supabase
            .from('ai_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId)
        }

        return NextResponse.json({ message: finalReply })
      }

      // Execute each tool call
      for (const toolCall of assistantMsg.tool_calls) {
        const toolName = toolCall.function.name
        const parsedArgs = JSON.parse(toolCall.function.arguments || '{}')
        const toolArgs = parsedArgs === null ? {} : parsedArgs
        const handler = toolHandlers[toolName]

        let toolResult: any
        if (handler) {
          toolResult = await handler(toolArgs)
        } else {
          toolResult = { error: `Unknown tool: ${toolName}` }
        }

        toolCallsMade.push({ name: toolName, args: toolArgs, result: toolResult })

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        })
      }

      iterations++
    }

    // Max iterations reached
    return NextResponse.json({
      message: 'Maximum iterations reached. Please try again.',
    })

  } catch (error: any) {
    console.error('AI Chat error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}