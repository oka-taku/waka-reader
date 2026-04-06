import type {} from 'hono'

declare module 'hono' {
  interface Env {
    Variables: Record<string, never>
    Bindings: Record<string, never>
  }
}
