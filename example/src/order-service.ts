import { EventBus, ActionReact, IEventBusMessage } from '../../dist/index'
(async () => {
    //init the event bus (connection to redis/kafka)
    await EventBus.init()
    class OrderService {

        private readonly inMemoryCache = {}

        /**
         * Totally async operation - when order submitted store the message in cache
         * @param message : { payload } : { userId, name, date }
         */
        @ActionReact({ action: 'submitted', domain: 'orders' })
        submitted = (message: IEventBusMessage) => {
            const { userId, name, date } = message.payload;
            console.log(`stated handling order ${name}`)
            if (!this.inMemoryCache[userId]) this.inMemoryCache[userId] = []
            this.inMemoryCache[userId].push({ name, date })
        }
        
        /**
         * Sync operation that returns the orders per filter
         * The message will produce a results to the queue and consume by the client
         * @param message : { payload }: { filters: { userId } }
         * returns Array<{ name, date}>
         */
        @ActionReact({ action: 'get', domain: 'orders' })
        get = (message: IEventBusMessage) => {
            const { filters }: { filters: { userId } } = message.payload;
            return this.inMemoryCache[filters.userId] || [];
        }

        @ActionReact({ action: 'get_error', domain: 'orders' })
        error = (message: IEventBusMessage) => {
            const { filters }: { filters: { userId } } = message.payload;
            throw new Error('you should see this error in the client')
        }


    }

    new OrderService();

})().catch(console.error)