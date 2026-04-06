import { createRoute } from 'honox/factory'
import WakaReader from '../islands/waka-reader'

export default createRoute((c) => {
  return c.render(
    <div class="waka-page-root">
      <WakaReader />
    </div>
  )
})
