# mailService
Rest API for A compose mail form allowing multiple reciepients. It uses sendGrid and Mail gun apis to send the emails. Has a failover security so that if one of the apis fails, it tries to sedn the mail using second API.

UI Source Code - Please check https://github.com/Dilipv1990/mailService-UI for UI source code.

Note :- This repo contains minified files for UI application in the ./public folder.

How to Run - 
1. Please create your API key for SendGrid and Api key + domain for Mailgun.
2. Add these details in env.json file.
3. Run npm install in the base folder
4. Run "npm start" to start the application.
5. The application can now be accessed at http://localhost:8000

