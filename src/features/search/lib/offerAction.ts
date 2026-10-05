export type SearchOfferPickTarget = {
  orderElementId: number
  onPicked?: () => void
  onError?: (message: string) => void
}

export type SearchOfferAction =
  | { mode: 'add-to-order' }
  | { mode: 'set-to-element'; target: SearchOfferPickTarget }
