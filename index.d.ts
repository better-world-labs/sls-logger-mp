/*
 * @Author: Sandy
 * @Date: 2022-08-16 11:02:14
 * @LastEditTime: 2022-08-16 14:58:20
 * @Description: ts 定义
 */
declare module "sls-logger-mp" {
  export default class SlsLoggerMp {
    constructor({
      host,
      project,
      logstore,
      time,
      count,
      storageKey
    }: {
      host: string;
      project: string;
      logstore: string;
      time?: number;
      count?: number;
      storageKey?: string;
    });

    send(log: Record<string, any>): void;
  }
}
