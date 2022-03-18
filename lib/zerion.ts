import io from 'socket.io-client'
import { deepEqual } from './deep-equal';

const BASE_URL = 'wss://api-v4.zerion.io/'

function verify(request: any, response: any) {
  if (response.meta.status === 'error') {
    for (const error of response.payload.errors) {
      console.error(error);
    }
  }

  for (const key in request.payload) {
    if (!deepEqual(request.payload[key], response.meta[key])) {
      console.log('fail', request.payload[key], response.meta[key], request, response)
      return false
    }
  }
  return true
}

const assetsSocket = {
  namespace: 'address',
  socket: io(`${BASE_URL}address`, {
    transports: ['websocket'],
    timeout: 1000,
    query: {
      api_token:
        process.env.ZERION_API_KEY_V4 ||
        'Demo.ukEVQp6L5vfgxcz4sBke7XvS873GMYHy',
    },
    // @ts-ignore
    extraHeaders: {
      HTTP_ORIGIN: 'http://localhost:3000',
      // Origin: 'https://app.zerion.io',
    }
  }),
}

function get(socketNamespace: any, requestBody: any) {
  return new Promise((resolve, reject) => {
    let waiting = true
    const { socket, namespace } = socketNamespace
    function handleReceive(data: any) {
      if (verify(requestBody, data)) {
        unsubscribe()
        resolve(data)
      }
    }
    const model = requestBody.scope[0]
    function unsubscribe() {
      waiting = false
      socket.off(`received ${namespace} ${model}`, handleReceive)
      socket.emit('unsubscribe', requestBody)
    }
    socket.emit('get', requestBody)
    socket.on(`received ${namespace} ${model}`, handleReceive)

    setTimeout(() => {
      if (waiting) {
        console.error('rejected', requestBody)
        reject(new Error('Request timed out'))
      }
    }, 10000)
  })
}

export class Zerion {
  async getTotalValue(address: string | string[]): Promise<number> {
    const payload = address instanceof Array
      ? { addresses: (address as string[]).map((address: string) => address.toLowerCase()) }
      : { address: address.toString().toLowerCase() }

    const portfolio: any = await get(assetsSocket, {
      scope: ['portfolio'],
      payload: {
        ...payload,
        currency: 'usd',
        // offset: 0,
        // limit: 20,
      },
    })

    return portfolio.payload.portfolio.total_value
  }

  async getPortfolio(address: string | string[]): Promise<any> {
    const payload = address instanceof Array
      ? { addresses: (address as string[]).map((address: string) => address.toLowerCase()) }
      : { address: address.toString().toLowerCase() }

    const response: any = await get(assetsSocket, {
      scope: ['positions'],
      payload,
    })

    const result = response.payload.positions.positions
      .map((position: any) => ({
        address: position.asset.asset_code,
        amount: position.quantity / (10 ** position.asset.decimals),
        name: position.asset.name,
        symbol: position.asset.symbol,
        icon: position.asset.icon_url,
        price: position.asset.price?.value,
        value: position.quantity / (10 ** position.asset.decimals) * (position.asset.price?.value || 0),
      }))
      .filter((position: any) => !!position.price)
    return result
  }
}
