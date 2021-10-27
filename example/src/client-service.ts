import { EventBus } from '../../dist/index'
import * as readline from 'readline'
import { promisify } from 'util'
(async () => {

    //init the event bus (connection to redis/kafka)
    await EventBus.init()

    //********************************************/
    ///client interface 
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question[promisify.custom] = (question) => {
        return new Promise((resolve) => {
            rl.question(question, resolve);
        });
    };

    const questions = async () => {
        //client interface example for operations 
        const operation: any = await promisify(rl.question)('Operation to do [ORDER,GET,SEE_ERROR] ?');
        if (operation == 'ORDER') {
            const userId: any = await promisify(rl.question)('User Id ? ');
            const name: any = await promisify(rl.question)('Order name ? ');
            await EventBus.publishAsync('submitted', { payload: { userId, name, date: Date.now() } }, 'orders')
        }
        else if (operation == 'SEE_ERROR') {
            try {
                await EventBus.getAsync('orders', 'get_error', { payload: { filters: { userId: -1 } } })
            }
            catch (err) {
                console.error(`you should get the error from the OrderService ${err}`)
            }
        } else if (operation == 'GET') {
            const userId: any = await promisify(rl.question)('User Id ? ');
            const results = await EventBus.getAsync('orders', 'get', { payload: { filters: { userId } } })
            console.log("*****************")
            console.log(`userId ${userId} have the following orders:`)
            results.map((item) => {
                console.log('**********')
                console.log(`${JSON.stringify(item)}`)
                console.log('**********')
            })
            console.log("*****************")
        }
        await questions();
    }
    await questions();
    //********************************************/

})().catch(console.error)