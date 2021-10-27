
export interface IEventBusMessage {
  id: string
  technicalKey:string;
  technicalOffset:string;
  partition:number;
  triggerNextEvents: [] 
  payload: any
}