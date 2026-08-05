import supabase from "../SupabaseClient";
import { sendWhatsAppMessage } from "./whatsappService";

/**
 * processDailyReminders
 * Yeh function har user ke pending tasks check karta hai aur din mein sirf 1 baar WhatsApp reminder bhejta hai.
 */
export const processDailyReminders = async () => {
    try {
        console.log("⏳ Starting Daily Reminder Check...");
        
        // Aaj ki date YYYY-MM-DD format mein
        const today = new Date().toISOString().split('T')[0];

        // 1. Un users ko fetch karein jinhe aaj reminder NAHI gaya hai
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, user_name, number, last_reminder_date')
            .or(`last_reminder_date.is.null,last_reminder_date.neq.${today}`);

        if (userError || !users) {
            console.error("Error fetching users for reminders:", userError);
            return;
        }

        if (users.length === 0) {
            console.log("✅ Sabhi users ko aaj ka reminder ja chuka hai.");
            return;
        }

        // 2. Pending Delegation & Checklist tasks fetch karein
        const { data: delegationTasks } = await supabase.from('delegation').select('*').neq('status', 'done');
        const { data: checklistTasks } = await supabase.from('checklist').select('*').neq('status', 'done');

        let remindersSent = 0;

        // 3. Har user ke liye check karein
        for (const user of users) {
            if (!user.user_name || !user.number) continue;

            const userDelegations = delegationTasks?.filter(t => (t.name || t.assigned_person) === user.user_name) || [];
            const userChecklists = checklistTasks?.filter(t => (t.name || t.assigned_person) === user.user_name) || [];

            const totalPending = userDelegations.length + userChecklists.length;

            if (totalPending > 0) {
                // User ke paas pending tasks hain
                const message = `🔔 *DAILY TASK REMINDER*\n\nDear ${user.user_name},\n\nAapke pas total *${totalPending}* tasks pending hain (Delegation: ${userDelegations.length}, Checklist: ${userChecklists.length}).\n\nKripya portal par login karke check karein aur deadline se pehle inhe complete karein.\n\n🔗 Link: https://master-system-weld.vercel.app\n\nRegards,\nAcemark Stationers`;
                
                // Message bhejein
                const isSent = await sendWhatsAppMessage(user.number, message);

                if (isSent) {
                    // Agar message chala gaya toh user ki `last_reminder_date` update kar dein taaki dobara na jaye
                    await supabase
                        .from('users')
                        .update({ last_reminder_date: today })
                        .eq('id', user.id);
                    
                    remindersSent++;
                    console.log(`✅ Reminder sent to ${user.user_name} (${user.number})`);
                }
            }
        }

        console.log(`🎉 Daily Reminder Process Complete. Sent ${remindersSent} reminders.`);

    } catch (error) {
        console.error("❌ Error processing daily reminders:", error);
    }
};
