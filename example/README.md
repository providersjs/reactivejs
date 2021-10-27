## e2e Example

To understand and explain how to use MicroJs - we will use an example, in this example we will provide a full (e2e) implementation that will use both *one-way* and *two-way* communication by emulation of services.
  

For the purpose of example, let's take two microservices **ClientService**, **OrderService**. each service has different domain that he manage and they should communicate with each other to complete the mission of shifting client order. 

* **ClientService** - A service the interacts with the client and giving him (you :) ) two options - place order OR get user orders.

* **OrderService** - A service that handles the orders domain, for this example it uses in-memory cache to store the items and to provide results.

To run this example you first need to run the docker-compose file under the example folder - the compose file contains *Zookeeper*, *Kafka* and *Redis* containers - all the things that needed to get MicroJs working:
```
docker-compose up -d
```

Under the example folder there are two env files that contains the mandatory variables.

```
KAFKA_SERVICE_NAME={Service Name}
KAFKA_GROUP={Service Group}
KAFKA_BROKER=localhost:29093
``` 

After having the containers up & running - it's recommended to open the example folder on different VSCode instance - it will be easy to debug and run.

Install the package via npm/yarn

```
npm i https://github.com/benmizrahi/microjs.git
```
After having that let's run typescript transpiler to get the JS files ready to run.

```
tsc 
``` 

Now were ready to run the example - each service is a different process - you can launch them via  VSCode run section. The client-service will pop a new terminal that allows you to communicate with it.

### What operation to do ? [ORDER,GET] 

Let's explore the communication pattern on each select: 

1.  ORDER - 
	* the client service uses publishAsync to produce a new message on the **order** domain   with the **submitted** action.
	* The order service received the message from via @ActionReact adds the message params to in-memory cache and finish his job.

2. GET
	* The client service populates a **get** action on the **orders** domain via publishAsync and waits from response
	* The order service receives the get action and get's the user orders and returns the message need to be resolve by the client request.
	* The client service gets the respond message and displays it on screen.

This example shows how to make an e2e usage of the event bus and running one-way | two way communication.

For question/requests/help please open PR or open an issues.  