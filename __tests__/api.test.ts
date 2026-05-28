/**
 * Tests des routes API
 * Ces tests vérifient le comportement des endpoints sans appels réels aux APIs externes.
 */

// Mock des dépendances externes
jest.mock('../lib/db', () => ({
  default: {
    document: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    chunk: { create: jest.fn() },
    searchHistory: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  },
}))

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    },
  }))
)

jest.mock('@anthropic-ai/sdk', () =>
  jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Source insuffisante — validation humaine requise.' }],
      }),
    },
  }))
)

describe('POST /api/search — validation de la query', () => {
  it('retourne 400 si query est vide', async () => {
    const { POST } = require('../app/api/search/route')
    const request = {
      json: async () => ({ query: '' }),
    } as any

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBeDefined()
  })

  it('retourne 400 si query est undefined', async () => {
    const { POST } = require('../app/api/search/route')
    const request = {
      json: async () => ({}),
    } as any

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('retourne 400 si query est trop courte', async () => {
    const { POST } = require('../app/api/search/route')
    const request = {
      json: async () => ({ query: 'abc' }),
    } as any

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('retourne 200 avec Source insuffisante si aucun document indexé', async () => {
    const { POST } = require('../app/api/search/route')
    const request = {
      json: async () => ({ query: 'Quelle est la hauteur minimale du garde-corps?' }),
    } as any

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.isInsufficient).toBe(true)
    expect(data.answer).toContain('Source insuffisante')
  })

  it('ne retourne jamais de sources si isInsufficient est true', async () => {
    const { POST } = require('../app/api/search/route')
    const request = {
      json: async () => ({ query: 'Question sur le code du bâtiment québécois' }),
    } as any

    const response = await POST(request)
    const data = await response.json()

    if (data.isInsufficient) {
      expect(data.sources).toHaveLength(0)
      expect(data.confidence).toBe(0)
    }
  })
})

describe('POST /api/ingest — vérification admin', () => {
  const originalEnv = process.env.ADMIN_MODE

  afterEach(() => {
    process.env.ADMIN_MODE = originalEnv
  })

  it('retourne 403 si ADMIN_MODE !== true', async () => {
    process.env.ADMIN_MODE = 'false'

    const { POST } = require('../app/api/ingest/route')
    const formData = new FormData()
    formData.append('name', 'Test')

    const request = {
      formData: async () => formData,
    } as any

    const response = await POST(request)
    expect(response.status).toBe(403)

    const data = await response.json()
    expect(data.error).toContain('Accès refusé')
  })

  it('retourne 403 si ADMIN_MODE est undefined', async () => {
    delete process.env.ADMIN_MODE

    const { POST } = require('../app/api/ingest/route')
    const request = { formData: async () => new FormData() } as any

    const response = await POST(request)
    expect(response.status).toBe(403)
  })
})

describe('GET /api/documents', () => {
  it('retourne un tableau de documents', async () => {
    const { GET } = require('../app/api/documents/route')
    const response = await GET()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
  })
})

describe('GET /api/history', () => {
  it('retourne un tableau de l\'historique', async () => {
    const { GET } = require('../app/api/history/route')
    const response = await GET()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
  })
})

describe('Garantie — aucune réponse sans source', () => {
  it('confidence est 0 quand isInsufficient est true', async () => {
    const { POST } = require('../app/api/search/route')
    const request = {
      json: async () => ({ query: 'Question quelconque sur les normes' }),
    } as any

    const response = await POST(request)
    const data = await response.json()

    if (data.isInsufficient === true) {
      expect(data.confidence).toBe(0)
      expect(data.sources).toHaveLength(0)
    }
  })
})
