import type { Plugin } from 'vite'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { applyBankEdit } from '../src/lib/bank/adminEdit.js'

const ALLOWED_FILES = ['positional', 'meta-qualities', 'reputation'] as const
type AllowedFile = typeof ALLOWED_FILES[number]

interface UpdateRequest {
  file: AllowedFile
  qid: string
  changes: {
    text?: string
    slots?: { who: string; what: string; problem: string }
  }
}

export function bankAdminPlugin(): Plugin {
  return {
    name: 'bank-admin',
    configureServer(server) {
      server.middlewares.use('/__bank/update', async (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        // Parse request body
        let body = ''
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString()
          if (body.length > 65536) {
            res.writeHead(413, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'body too large' }))
            return
          }
        })
        req.on('end', () => {
          try {
            const { file, qid, changes } = JSON.parse(body) as UpdateRequest

            // File whitelist — never trust a client-supplied path
            if (!ALLOWED_FILES.includes(file as AllowedFile)) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'invalid file' }))
              return
            }

            const filePath = resolve(
              process.cwd(),
              `src/data/question-bank/questions/${file}.json`,
            )

            let fileContent: string
            try {
              fileContent = readFileSync(filePath, 'utf-8')
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'file not found' }))
              return
            }

            const result = applyBankEdit(fileContent, qid, changes)

            if (!result.ok) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: result.error }))
              return
            }

            writeFileSync(filePath, result.updated, 'utf-8')

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, warnings: result.warnings }))
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'parse error' }))
          }
        })
      })
    },
  }
}
