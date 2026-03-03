#!/bin/bash

# A simple script to push your latest changes to GitHub and trigger a Vercel deployment.

echo "🚀 Preparing to deploy Time Tracker updates..."

# Make sure we are in the right directory
cd "$(dirname "$0")"

# Ask for a commit message
echo ""
echo "📝 Enter a short description of the changes you made:"
read commit_message

if [ -z "$commit_message" ]; then
    commit_message="Update Time Tracker from script"
fi

echo ""
echo "📦 Staging files..."
git add .

echo ""
echo "💾 Committing changes..."
git commit -m "$commit_message"

echo ""
echo "☁️ Pushing to GitHub (this will trigger Vercel automatically!)..."
git push origin main

echo ""
echo "✅ Done! Vercel is building your app right now."
echo "Wait about 30 seconds, then fully close and reopen the app on your iPhone to see the updates."
echo ""
