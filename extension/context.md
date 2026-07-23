PROJECT DOCUMENTATION
on
Focusnyx: Student Life Operating System for Bangladeshi Students

“Block your dopamine. Forge your future.”

Submitted By:

S. M. Mehrab Hossain Jayeed
ID: 223071033
Semester: 9th
Batch: 31st
Email: mehrabjayeed715@gmail.com
Phone No.: 01533652232

Submission Date: 14 June. 2026

Table of Contents
Abstract...................................................................................................................................... 1

1. Problem Statement................................................................................................................. 1

1.1 Identified Pain Points........................................................................................................... 1

2. Proposed Solution.................................................................................................................. 1

2.1 Core Feature Modules...................................................................................................... 2

2.2 Productivity Analytics Tiers.............................................................................................2

2.3 Gamification & XP System..................................................................................................3

3. Tech Stack.............................................................................................................................. 3

3.1 PWA (Primary Dashboard)...............................................................................................3

3.2 Browser Extension........................................................................................................... 3

3.3 Python Companion App (Windows App Blocker)...........................................................4

3.4 Backend (Supabase)......................................................................................................... 4

4. System Architecture............................................................................................................... 5

4.1 High-Level Architecture Overview..................................................................................5

4.2 Focus Session Data Flow................................................................................................. 5

4.3 Voice Notes Data Flow.....................................................................................................6

4.4 Database Schema (Key Tables)........................................................................................ 6

5. Setup & Running Instructions................................................................................................6

5.1 Prerequisites..................................................................................................................... 7

5.2 Part 1 — Supabase Setup................................................................................................. 7

5.3 Part 2 — PWA Setup........................................................................................................ 7

5.4 Part 3 — Browser Extension Setup..................................................................................8

5.5 Part 4 — Python Companion App (Windows App Blocker)........................................... 8

5.6 Part 5 — Voice Notes Setup............................................................................................. 9

6. Testing.................................................................................................................................... 9

6.1 Core Test Cases................................................................................................................ 9

7. Development Timeline (8 Weeks)........................................................................................10

8. Known Limitations...............................................................................................................10

9. Future Scope.........................................................................................................................11

10. References.......................................................................................................................... 11

1

Abstract

Focusnyx  is a unified student life operating system purpose-built for Bangladeshi university
students, with a focus on ADHD-friendly design and culturally relevant features. It combines
a  Progressive  Web  App  (PWA)  powered  by  Next.js  14,  a  paired  browser  extension  for
Chrome  and  Firefox,  and  a  Python  companion  desktop  application  for  Windows-level
application blocking. Together these three components deliver academic planning, deep-focus
timers  with  XP  gamification,  voice-captured  smart  notes,  distraction  blocking  across  both
browsers  and  native  apps,  student  finance  tracking,  wellness  monitoring,  and  an  AI
behavioral coach with Bangla-first recommendations.

1. Problem Statement

Bangladeshi university students face a fragmented productivity landscape. Existing tools are
designed  for  a  Western,  neurotypical  user  and  fail  to  address  the  combined  reality  of
academic pressure, mobile-first usage, financial constraints, and the absence of mental health
scaffolding.

1.1 Identified Pain Points

●  No single platform integrates academics, focus, finance, and wellness for Bangladeshi

students.

●  Popular tools like Notion and Forest are English-only and lack Bangladeshi financial

context (bKash, Nagad).

●  Existing Pomodoro apps have no distraction-blocking capability at the OS or browser

level.

●  Students with ADHD tendencies have no low-friction, reward-driven environment

tailored to their needs.

●  Manual task management is abandoned due to high cognitive overhead of setup.
●  No tool tracks CGPA trends alongside study hours and behavioral patterns in one

place.

●  Voice-based note capture is unavailable in any Bangladeshi-context student app.
●  Social media and YouTube consumption during study is untracked and unmanaged.

2. Proposed Solution

Focusnyx  acts as a three-layer system: a PWA dashboard for daily planning and analytics, a
browser  extension  for  real-time  distraction  control,  and  a  Python  companion  app  for
Windows-level  process  blocking.  All  three  layers  share  a  single  Supabase  backend  and
authenticated session.

1

2.1 Core Feature Modules

Module

Key Features

Technologies

Smart Academic
Forge

Dopamine Detox
Engine

Smart Notes Vault

Student Finance
Tracker

Wellness Shield

AI Behavioral
Coach

Browser Extension

Python App
Blocker

AI study plans, micro-task
breakdown, CGPA tracker,
exam reminders

Pomodoro + hyperfocus timer,
XP badges, distraction pattern
tracker

Voice-to-text capture, subject
tagging, auto-quiz generator
from notes

Manual expense logging,
weekly budget health score,
gentle alerts

Mood journal, sleep tracker,
study/rest balance, burnout
prevention

Weekly insights, habit
detection, Bangla-first
recommendations

Site blocking during
Pomodoro, distraction
logging, one-click Focus Lock

Windows-level process
blocking for native apps
during focus sessions

Gemini/Groq API, Supabase

React, Tone.js

Web Speech API, Groq Whisper,
Supabase

Recharts, Supabase

Recharts, Supabase

Gemini/Groq API, Supabase

Chrome/Firefox Extension API

Python, psutil, pywin32,
WebSocket

2.2 Productivity Analytics Tiers
Focusnyx provides three levels of behavioral analytics:

Tier

Daily

Weekly

Monthly

Analytics Included

% of tasks completed, focus session duration vs. target, distraction
attempts blocked, mood check, BDT spent vs. daily budget

7-day productivity graph, subject time distribution, focus depth score,
budget adherence, top 3 blocked sites

AI-identified academic strengths/weaknesses, CGPA trend vs. study
hours, personalized improvement plan in Bangla

2

2.3 Gamification & XP System

The XP system is designed to create a low-friction reward loop:

1.  XP Earned: Completing a focus session awards XP proportional to actual_minutes vs

planned_minutes. Completing an academic task awards its xp_reward value.

2.  Leveling: total_xp is accumulated across all sessions. Level thresholds are: Level 1 =

0 XP, Level 2 = 500 XP, Level 3 = 1500 XP (multiplicative scaling).

3.  Streak: streak increments each consecutive day the user logs at least one completed

task or focus session. Breaking the streak resets to 1.

4.  Focus Score: focus_score is a rolling metric (0–100) calculated from

sessions_completed, completed_tasks_today, and distraction attempts in the last 7
days. It is displayed on the dashboard as the user's "productivity health."

5.  Today XP: today_xp resets at midnight (handled by a Supabase scheduled function or

client-side comparison with last_active_at).

3. Tech Stack

3.1 PWA (Primary Dashboard)

Framework

Language

Auth

Database

AI

Charts

Voice Notes

Styling

Next.js 14 (App Router, React Server Components)

TypeScript

NextAuth.js (email/credentials + Supabase session sharing)

Supabase  (PostgreSQL)  —  habit  logs,  tasks,  finance,  mood,
notes

Gemini  API  /  Groq  API  —  study  plans,  quiz  generation,
coaching reports

Recharts  —  CGPA  trends,  finance,  focus  depth,  productivity
graphs

Web  Speech API (browser STT) + Groq Whisper API (fallback,
higher accuracy)

Tailwind  CSS  —  dark  slate,  electric  teal  (#0E7C7B),  amber,
coral, violet

Deployment

Vercel (PWA manifest for installable Android/iOS/Desktop)

3

3.2 Browser Extension

Target

Auth Sync

Site Blocking

Distraction Log

Focus Lock UI

Dashboard Link

Chrome (Manifest V3) and Firefox (Manifest V2 compatible)

Shared  Supabase  JWT  token  from  PWA  stored  in  extension
storage

declarativeNetRequest  API  (Chrome  MV3)  /  webRequest  API
(Firefox)

Logs  each  blocked  attempt  to  Supabase  via  background service
worker

Browser  action  popup  for  one-click  Pomodoro start + block-list
toggle

Block-list  managed  from  PWA;  extension  reads  from  Supabase
on sync

3.3 Python Companion App (Windows App Blocker)

Language

Python 3.10+

Process Control

psutil — enumerates and terminates Windows processes by name

OS Integration

Communication

Tray Icon

Config File

Startup

Auth

pywin32  (win32api,  win32con)  —  Windows  API  access  for
process management

WebSocket  client (websockets library) — receives focus session
events from PWA

pystray  +  Pillow  —  system  tray  icon  with  start/stop/status
options

app_blocklist.json  —  user-editable  list  of  executable  names  to
block

Registers as Windows startup entry via winreg (optional)

Reads Supabase JWT from a local config file synced by the PWA
on login

3.4 Backend (Supabase)

Database

Auth

Storage

PostgreSQL  —  users,  tasks,  sessions,  finance,  mood,  notes,
blocklists

Supabase  Auth  —  email/password,  JWT  session,  shared  with
extension + Python app

Supabase Storage — voice note audio files, profile pictures

4

Realtime

Edge Functions

Supabase  Realtime  —  live  sync  of  focus  session  state  to
extension and Python app

Proxy  for  Gemini/Groq  API  calls  (API  key  never  exposed  to
client)

4. System Architecture

4.1 High-Level Architecture Overview
Focusnyx  is  a  three-client  system connected to a single Supabase backend. All three clients
authenticate with the same Supabase JWT and read/write from shared tables.

Figure: System Architecture Diagram

5

4.2 Focus Session Data Flow

1.  User starts a Pomodoro session on the PWA dashboard.
2.  PWA writes session_start event to Supabase Realtime channel

focusnyx:sessions:{user_id}.

3.  Browser extension listens on the same Realtime channel and activates site blocking

rules.

4.  Python companion app receives the focus_start WebSocket message from the PWA
local relay and starts blocking processes listed in app_blocklist.json via psutil.

5.  When the Pomodoro timer ends, the PWA writes session_end; both the extension and

Python app deactivate blocks.

6.  All distraction attempts (browser + app) are logged to Supabase and visualized in

daily/weekly reports.

4.3 Voice Notes Data Flow

1.  User clicks the mic button on the Notes page.
2.  Browser Web Speech API captures speech in real time and shows live transcript.
3.  On stop, if Web Speech confidence is low or the browser is Firefox/unsupported, the
audio blob is sent to the Supabase Edge Function which proxies it to Groq Whisper
API.

4.  Transcribed text is saved to the notes table in Supabase with subject tag and

timestamp.

5.  User can trigger auto-quiz generation: note text is sent to Gemini via Edge Function

and returns MCQs stored in the quizzes table.

4.4 Database Schema (Key Tables)

The actual schema (/supabase/schema.sql) contains 25 tables. Key groupings:

Domain

Academic

Focus
Notes
Finance
Wellness

AI Coach

Tables

profiles (level, XP, streak, focus_score, sessions_completed)
academic_tasks, academic_courses, academic_exams,
academic_study_plans, academic_semester_cgpas
focus_sessions, distraction_logs, blocklist_sites
notes (with source field for typed vs voice)
expenses, transactions, budgets, debts, savings_goals
wellness_logs, wellness_hydration, wellness_sleep_sessions,
wellness_mood_entries, wellness_medications, wellness_medication_logs,
wellness_activity, wellness_body_metrics, daily_wellness
coach_reports

6

5. Setup & Running Instructions

5.1 Prerequisites

Tool

Node.js

npm / yarn

Python

Required Version / Notes

v18.x or later (LTS recommended)

Comes with Node.js; yarn optional

3.10 or later (Windows only for companion app)

Supabase Account

Free  tier  at  supabase.com  —  project  URL  and  anon  key
needed

Groq API Key

Free at console.groq.com (for Whisper voice + LLM coach)

Gemini API Key

Free tier at aistudio.google.com (for study plan generation)

Chrome / Firefox

For  loading  the  unpacked  browser  extension  in  developer
mode

Git

For cloning the repository

5.2 Part 1: Supabase Setup

1.  Create a new Supabase project at https://supabase.com
2.  Go to SQL Editor and run the provided schema file: /supabase/schema.sql
3.  Go to Settings > API and copy: Project URL and anon public key.
4.  Go to Edge Functions and deploy the two functions:

●  supabase/functions/ai-proxy/index.ts — proxies Gemini/Groq calls
●  supabase/functions/whisper-proxy/index.ts — proxies Groq Whisper

audio

5.  In Edge Functions environment variables, set: GROQ_API_KEY and

GEMINI_API_KEY

6.  Enable Supabase Realtime for the focus_sessions table in Database > Replication.

5.3 Part 2: PWA Setup
Clone the repository and set up the environment:

git clone https://github.com/mhjayeed715/Focusnyx.git
cd focusnyx/pwa
cp .env.example .env.local
Edit .env.local and fill in the following:

NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXTAUTH_SECRET=any_random_32_char_string
NEXTAUTH_URL=http://localhost:3000

7

Install dependencies and start the development server:

npm install
npm run dev

The  PWA  is  now  accessible  at  http://localhost:3000.  To  install  it  as  a  PWA  on
Android/Desktop, open in Chrome and use Add to Home Screen / Install App.

5.4 Part 3: Browser Extension Setup

1.  Open Chrome and navigate to chrome://extensions
2.  Enable Developer Mode (toggle in the top right).
3.  Click Load unpacked and select the focusnyx/extension/ folder.
4.  The Focusnyx extension icon will appear in the browser toolbar.
5.  Log in to the PWA first. The extension reads the Supabase JWT from localStorage

and syncs automatically.

For Firefox:

6.  Open about:debugging#/runtime/this-firefox
7.  Click Load Temporary Add-on and select extension/manifest.json

To manage your block-list, go to the Settings > Block List page in the PWA. Changes sync to
the extension within 5 seconds via Supabase Realtime.

5.5 Part 4: Python Companion App (Windows App Blocker)
This  component  only  runs  on  Windows.  It  must  be  run  as  Administrator  for  process
termination to work correctly.

Install Python dependencies:

cd focusnyx/python-blocker
pip install -r requirements.txt

requirements.txt includes: psutil, pywin32, websockets, pystray, Pillow, python-dotenv

Create a .env file in the python-blocker folder:

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
PWA_WEBSOCKET_URL=ws://localhost:3000/api/focus-relay

Edit app_blocklist.json to add the Windows executable names you want to block during focus
sessions:

{ "blocked_apps": ["Discord.exe", "Telegram.exe", "vlc.exe", "chrome.exe"] }

Run the companion app (as Administrator):

python main.py

8

A tray icon will appear in the Windows system tray. Right-click for Start/Stop/Status options.
The app auto-connects to the PWA WebSocket relay and listens for focus session events.

To auto-start on Windows login (optional):

python install_startup.py

5.6 Part 5: Voice Notes Setup
Voice  notes  work  out  of  the  box  in  Chrome  and  Edge  using  the  Web  Speech  API  with  no
configuration needed. For Firefox or higher-accuracy transcription:

1.  Ensure GROQ_API_KEY is set in the Supabase Edge Function environment.
2.  In PWA Settings > Notes, toggle Use Groq Whisper for transcription.
3.  Speak into the mic — audio is captured, sent to the Supabase Edge Function, and

transcribed via Groq Whisper API.

Microphone permission must be granted by the browser when first using voice notes.

6. Testing

6.1 Core Test Cases

Test Case

User Registration

Input
Valid university email
+ password

Focus Session
Start

Click "Start Pomodoro"
(25 min)

Timer reaches 0

Navigate to blocked
domain during active
session
Open Discord.exe
during active session
Speak into mic
(Chrome)

Focus Session
Complete

Site Block

App Block
(Python)
Voice Note
Capture
Voice Note
(Whisper
fallback)

Expected Output
Account created, profile row inserted with
defaults (level=1, XP=0, streak=1)
Session record created; browser extension
activates block rules; Python tray icon shows
"BLOCKING" status
XP awarded, total_xp and today_xp updated;
session logged; blocks deactivated

Browser extension intercepts; request
blocked; distraction_logs entry created

psutil detects process; terminates it; tray
notification shown
Transcript appears live via Web Speech API;
saved to notes table on stop

Toggle Whisper +
record audio

Audio blob sent to Edge Function; Groq
Whisper returns transcript; saved to DB

Finance Entry

Add expense: 150
BDT, category "Food"

AI Coach Report

Trigger weekly report

Cross-User RLS

User A tries to query
User B's tasks via API

Entry appears in daily log; weekly budget
health score recalculates
Gemini/Groq returns report text; stored in
coach_reports table; displayed in Coach tab
Supabase returns 0 rows (RLS policy blocks
access)

9

7. Development Timeline (8 Weeks)

Week

Sprint

Tasks

Deliverable

1

2

3

4

5

6

7

8

Foundation

Focus Engine

Finance Tracker

Academic Forge

Wellness + Notes

Browser Extension

Supabase
schema,  Next.js
setup,  NextAuth,  Tailwind
design system, PWA manifest

Auth
layout

+

base

Pomodoro  timer,  XP  system,
session
logging,  WebSocket
relay server

Expense  CRUD,  weekly
budget
Recharts
score,
dashboard

Task  creation,  AI  study  plan
(Gemini),  CGPA
tracker,
exam reminders

Mood  journal,  sleep  tracker,
voice  notes  (Web  Speech  +
Whisper), auto-quiz

Chrome  MV3  +  Firefox
extension,
blocking,
site
distraction  logging,  block-list
sync

Dopamine  Detox
module

Finance module

Academic  Forge
module

Wellness  +  Notes
modules

Working
extension

Python  Blocker  +  AI
Coach

psutil  app  blocker,  tray  icon,
WebSocket
integration,
weekly AI report

Python
companion
Coach

+

Polish + Deploy

3-tier analytics, Bangla toggle,
bug  fixes,  Vercel deployment,
demo prep

Final
app

deployed

8. Known Limitations

Limitation

Detail

Desktop Extension
Only

Browser extension works on desktop Chrome/Firefox. No
mobile browser extension support.

Python App Blocker:
Windows Only

psutil + pywin32 process blocking is Windows-specific.
macOS/Linux support not in MVP scope.

Sync Dependency

Extension and Python app require PWA to be active or
Supabase Realtime to be reachable. Offline sync is limited.

10

Limitation

Detail

Manual Finance Entry

Finance tracker relies entirely on manual input. No
bKash/Nagad API integration in MVP.

AI Quality Dependency

AI study plans and coaching improve only when users
consistently log tasks, mood, and habits. Sparse data = generic
output.

Voice Notes Accuracy

Web Speech API accuracy varies by accent and mic quality.
Groq Whisper fallback adds latency.

Supabase Free Tier
Limits

Free tier row and storage limits may constrain scale beyond a
small test group.

9. Future Scope

●  bKash/Nagad SMS parsing integration for automatic finance tracking.
●  Mobile companion app (React Native) with notification-based Pomodoro and mobile

site/app blocking using Screen Time API (iOS) or Usage Access (Android).
●  macOS support for the Python companion using AppKit process management.
●  Peer study rooms with shared Pomodoro timers and real-time note collaboration.
●  CGPA prediction model trained on study hours and behavior data.
●  LMS integration: import assignment deadlines directly from university portals.
●  Bangla full UI translation and Bangla voice note transcription fine-tuning.

10. References

1.  Next.js Documentation — https://nextjs.org/docs
2.  Supabase Documentation — https://supabase.com/docs
3.  Chrome Extension API (MV3) — https://developer.chrome.com/docs/extensions/mv3
4.  Groq API Documentation — https://console.groq.com/docs
5.  Google Gemini API — https://ai.google.dev/docs
6.  psutil Documentation — https://psutil.readthedocs.io
7.  Web Speech API —

https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

8.  Recharts — https://recharts.org
9.  pystray (System Tray) — https://pypi.org/project/pystray

11

