import { siteConfig } from "@/config/site"

export class WikiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "WikiError"
    this.status = status
  }
}

export function wikiOrigin(lang: string) {
  return `https://${lang}.wikipedia.org`
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

export async function wikiFetch(url: string, signal?: AbortSignal) {
  let response: Response
  try {
    response = await fetch(url, {
      signal,
      headers: { "Api-User-Agent": siteConfig.userAgent },
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new WikiError(0, "Wikipedia didn't respond")
  }

  if (!response.ok) {
    throw new WikiError(
      response.status,
      `Wikipedia request failed (${response.status})`,
    )
  }

  return response
}

export async function wikiJson<T>(url: string, signal?: AbortSignal) {
  const response = await wikiFetch(url, signal)
  return (await response.json()) as T
}
