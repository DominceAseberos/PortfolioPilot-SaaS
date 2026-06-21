import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Due to ON DELETE CASCADE on the reports table, deleting reviews will automatically delete associated reports.
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to clear history:', error)
      return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'History cleared successfully' })
  } catch (error) {
    console.error('Clear history error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
