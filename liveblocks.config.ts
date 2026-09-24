declare global {
  interface Liveblocks {
    UseMeta: {
      id: string
      info: {
        name: string
        avatar?: string
      }
    }
  }
}

export {}
