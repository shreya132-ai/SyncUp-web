# SyncUp — Manual QA Tester Guide

Welcome to the **SyncUp** Quality Assurance testing guide! This document explains how to test all features of the application step-by-step in plain language.

---

## 🚀 How to Launch the Application

1. Double-click **`start.bat`** in the project folder.
2. Your default web browser will open at **`http://localhost:3000`**.
3. You will see the SyncUp landing page with the headline:  
   *"Find Teammates. Build Projects. Grow Together."*

---

## 🔑 Logging In (Instant Demo Access)

You do **not** need to create a new account to test the full application.

1. On the landing screen, click the **`🚀 Preview Demo`** button.
2. You will be logged in immediately as:
   - **Name:** Shreya Sinha
   - **Handle:** `@shreya_sinha`
   - **College:** Amity University Patna | BCA 2nd Sem
   - **Role:** Authorized Lead Developer

---

## 🧪 Test Case 1: Discover → Apply Flow

*Goal: Verify that a developer can browse project cards, apply to a team, and see their status update.*

1. In the top navigation bar, ensure you are on the **🏠 Home** tab.
2. Scroll through the feed and find a project card by another author (e.g. *"Build a Real-Time Chat App"* by Rohit Kumar).
3. Look at the card:
   - Verify it shows:
     - Open roles (e.g., `🎯 2 roles open`)
     - Applicant count (e.g., `👥 1 applicant`)
     - Required skill tags (`React`, `Node.js`, `MongoDB`, etc.)
4. Click the primary **🤝 Apply to Join** button.
5. A modal/bottom sheet titled **"🤝 Apply to Join Team"** will open:
   - Choose a role from the dropdown (e.g., `Frontend Developer`).
   - In the pitch box, write: *"I have built two React projects and want to collaborate on this team!"*
   - Click **Submit Application**.
6. **Expected Result:**
   - A success toast notification appears: *"Application submitted! The lead has been notified."*
   - The button on the post card changes to a disabled **`Applied ✓`** button.
   - You cannot submit a duplicate application for this project.

---

## 🧪 Test Case 2: Review → Accept Flow (Auto-Chat)

*Goal: Verify that a project lead can review applicants, accept one, and have a chat thread open automatically.*

1. In the sidebar (or bottom bar on mobile), click **📥 Inbox**.
2. Notice the two tabs at the top: **💬 Chats** and **📥 Applications**.
3. Click the **📥 Applications** tab:
   - You will see the **"Team Applications Received"** section.
   - You will see an applicant (e.g. *Sneha Verma*, applied for *Frontend Developer*).
   - Notice the status badge says **PENDING** in amber.
4. Click the **✅ Accept** button:
   - A toast appears: *"Accepted Sneha Verma! Opening team chat..."*
   - The application status badge updates to **ACCEPTED ✓** in green.
5. **Expected Result:**
   - The screen automatically switches to the **💬 Chats** tab.
   - The chat thread with the accepted partner opens.
   - An automated welcome message is sent:  
     *"🎉 Welcome to the team! Glad to have you collaborate on this project..."*
   - Notice the double checkmarks (`✓✓`) indicating delivered and read status.

---

## 🧪 Test Case 3: Decline → Undo Flow

*Goal: Verify that declining an applicant provides a 5-second Undo action.*

1. In **📥 Inbox → Applications**, find an applicant with a **PENDING** status.
2. Click **❌ Decline**:
   - The applicant status turns to **DECLINED** in gray.
   - A toast notification slides in from the bottom:  
     *"Declined application from [Name]."* with an **Undo** button.
3. Click the **Undo** button in the toast before it disappears:
   - **Expected Result:** The application status immediately returns to **PENDING** in amber, and a confirmation toast appears: *"Application restored to Pending."*

---

## 🧪 Test Case 4: Post Creation (Two-Step Wizard & Word Counter)

*Goal: Verify that creating a post validates the 100-word limit and displays a live preview.*

1. Click the **➕ Create Post** button (in the sidebar or top bar, or the raised center `+` button on mobile).
2. The modal opens in **Step 1: Write Details**:
   - Fill in Title: *"Smart Campus Navigation App"*
   - Category: Select *"College Projects"*
   - Status: Select *"🟢 Recruiting"*
3. In the **Project Description** box, observe the word counter (`0 / 100`):
   - Type 20 words → Counter shows `20 / 100` in muted gray.
   - Paste 92 words → Counter turns **amber/yellow** indicating a warning threshold (`92 / 100`).
   - Paste 105 words → Counter turns **red** (`105 / 100`) and the "Next: Preview →" button becomes disabled.
4. Reduce text back to under 100 words.
5. Click **Next: Preview →**:
   - The modal transitions smoothly to **Step 2: Live Preview**.
   - You will see an exact replica of how the post will appear on the feed with author details, tags, and status.
6. Click **+ Post to Feed**:
   - The sheet closes.
   - A toast appears: *"Project published successfully!"*
   - Your new post appears at the top of the feed stream.

---

## 🧪 Test Case 5: Real-Time Chat & Typing Indicator

*Goal: Verify messaging, typing indicators, and room switching.*

1. Open **📥 Inbox → 💬 Chats**.
2. Click **🌐 Global Room**:
   - Verify you can type a message in the input at the bottom and press Enter or click the send button (`➤`).
   - Your message appears in a speech bubble with a timestamp.
3. Switch back to **🔒 1-on-1 DMs**:
   - Select a contact from the roster.
   - Type and send a message.
   - Observe that after sending, a simulated partner typing indicator appears:  
     `[Contact Name] is typing...` with animated bouncing dots.
   - A simulated reply arrives within 2 seconds.

---

## 🧪 Test Case 6: Feed Filters & Personalization

*Goal: Verify filter chips, sorting, and skill recommendations.*

1. On the **🏠 Home** feed:
   - Click the **Hackathons** category pill → Feed filters only hackathon posts.
   - Click the **React** skill chip → Feed filters only posts requiring React.
   - Click the Role dropdown → Choose **Backend Developer** → Feed filters matching roles.
   - Click **Reset All Filters** → Full feed is restored.
2. Notice the `✨ Matches your skills` recommendation badge:
   - Because your profile has *Java, Python, React, UI/UX*, posts containing those skills display the green recommendation pill and are prioritized near the top.

---

## 🧪 Test Case 7: Keyboard Accessibility & Mobile Responsiveness

1. **Keyboard:**
   - Press the **Tab** key from the top of the page.
   - A visible **"Skip to main content"** button will appear in the top-left corner.
   - Tab through buttons: verify each has a clear, visible focus ring (`2.5px solid #087F5B`).
   - Open any sheet/modal and press the **Escape** key → The sheet closes immediately.
2. **Mobile (<768px):**
   - Resize your browser window to a narrow mobile width (e.g. 375px).
   - Verify the desktop sidebar and right rail hide automatically.
   - Verify the bottom tab bar appears with the raised green `+` button in the center.
   - Click `+` → The dialog slides up as an accessible **bottom sheet** with a drag handle.
