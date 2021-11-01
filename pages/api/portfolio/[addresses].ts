import { NextApiRequest, NextApiResponse } from 'next'
import { Zerion } from 'zerion'

const ONE_HOUR = 60 * 60 * 1000

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const addresses = (req.query.addresses as string).split(',');

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    )
    if (req.method == 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET')
      return res.status(200).json({})
    }

    const zerion = new Zerion()

    const [totalValue, portfolio] = await Promise.all([
      zerion.getTotalValue(addresses),
      zerion.getPortfolio(addresses),
    ])

    res.setHeader('Cache-Control', 'max-age=60, s-maxage=${ONE_HOUR}, stale-while-revalidate');
    res.json({ success: true, statusCode: 200, value: { totalValue, portfolio } })
  } catch (err) {
    res.status(500).json({ success: false, statusCode: 500, message: err.message })
  }
}

export default handler
