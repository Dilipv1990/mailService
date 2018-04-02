# mailService
A compose mail form allowing multiple reciepients. It used sendGrid and Mail gun apis to send the emails. Has a failover security so that if one of the apis fails, it tries to sedn the mail using second API.
