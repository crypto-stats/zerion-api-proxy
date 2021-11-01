import io from 'socket.io-client'

const BASE_URL = 'wss://api-v4.zerion.io/'

function verify(request: any, response: any) {
  // each value in request payload must be found in response meta
  return Object.keys(request.payload).every(key => {
    const requestValue = request.payload[key]
    const responseMetaValue = response.meta[key]
    if (typeof requestValue === 'object') {
      return JSON.stringify(requestValue) === JSON.stringify(responseMetaValue)
    }
    return responseMetaValue === requestValue
  });
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
        console.error(requestBody)
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
        portfolio_fields: 'all',
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
      scope: ['assets'],
      payload,
    })

    const result = Object.values(response.payload.assets)
      .map((asset: any) => ({
        address: asset.asset.asset_code,
        amount: asset.quantity / (10 ** asset.asset.decimals),
        name: asset.asset.name,
        symbol: asset.asset.symbol,
        icon: asset.asset.icon_url,
        price: asset.asset.price?.value,
        value: asset.quantity / (10 ** asset.asset.decimals) * (asset.asset.price?.value || 0),
      }))
      .filter((asset: any) => !!asset.price)
    return result
  }
}
