import { AxiosResponse } from 'axios';

export type IGetSecurityClients = AxiosResponse<{
  clients: {
    "_id": string,
    "clientId": string,
    "platform": string
    "notes": string,
    "createdAt": string,
    "updatedAt": string,
    "__v": number,
  }[],
}>;
