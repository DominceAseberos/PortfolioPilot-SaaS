import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CLAIM_BONUS_CREDITS } from '@/config/pricing'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already claimed
    const { data: creditData, error: fetchError } = await supabase
      .from('user_credits')
      .select('has_claimed_free_credits, credits')
      .eq('user_id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user credits:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (creditData?.has_claimed_free_credits) {
      return NextResponse.json({ error: 'Already claimed' }, { status: 400 })
    }

    // They haven't claimed. Update balance and set has_claimed_free_credits to true.
    const newBalance = (creditData?.credits || 0) + CLAIM_BONUS_CREDITS

    const { error: updateError } = await supabase
      .from('user_credits')
      .upsert({ 
        user_id: user.id, 
        credits: newBalance, 
        has_claimed_free_credits: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (updateError) {
      console.error('Error updating user credits:', updateError)
      return NextResponse.json({ error: 'Failed to claim credits' }, { status: 500 })
    }

    return NextResponse.json({ success: true, newBalance })
  } catch (error) {
    console.error('Claim credits error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
