#!/bin/bash
cd /home/kavia/workspace/code-generation/universal-chat-platform-2834-2844/chat_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

