import { RedisCache } from "./redis.cache";

export interface ICaching {
  set(key,value)
  get(key):Promise<any>
  delete(key):Promise<any>
  registerOnChange(key,cb):boolean
  unRegisterOnChange(key):boolean
  shutdown();
  init():Promise<void>;
  publish(key,value):Promise<any>
  isHealth()

} 

export function caching(type):ICaching{
  return new RedisCache()
}