# ojt_trackerversion1
-clone of the original ojt tracker using php,sql,html,css and javascript 

-PHASE 1 

MOVED THE PHP FILE AND SQL TO A NEW DATABASE SYSTEM SUPABASE 

CUSTOMIZE IT TO HAVING NEAR THE SAME VISUAL DESIGN OF THE ORIGINAL OJT TRACKER 

ADDED A INFO CARD STYLE FOR INTERNS REGISTERED IN THE ADMIN PANEL 

ADDED TWO OPTIONS FOR THE ADMIN PANEL 'GRID VIEW AND LIST VIEW' 

-- PHASE 2  

The Dashboard Connection 

Integrated a dedicated recovery link in the Login.jsx card. We styled it with the municipality's green theme to make it visible but professional.

fixed the major bug where logs weren't showing up. We updated the logic to first grab the auth_id from Supabase Auth, then find the corresponding numeric id in your users table.

updated the fetchLogs function to use .eq('user_id', profileData.id). This ensured that when Camilo logs in, he only sees Camilo's logs, and not everyone else's.

fixed the handleSaveLog function so that every new entry is automatically stamped with the correct user_id, preventing "orphaned" logs that don't belong to anyone.

UI & Logic Upgrades

Added the password eye-toggle using your custom PNG assets and fixed the relative file paths.

Built the algorithm to automatically deduct the 1-hour lunch break (12 PM – 1 PM) so interns don't over-report hours.

Added the time-of-day greetings ("Good Morning," etc.) and moved them to a better spot above the stats cards.

Cleaned up the Admin view to be a "Supervision Command Center" without the unnecessary dashboard links.