import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '../ui/input'

type RepoTextDraft = { repoId: string; text: string }

// Why: updateRepo persists via async IPC before the store value updates, so a
// store-controlled input resets mid-IME-composition (Hangul decomposes into
// jamo). Keep keystrokes in local draft state; persist per-keystroke except
// while an IME composition is active (see composingRef below).
export function RepoSettingsDraftInput({
  repoId,
  storeValue,
  onTextChange,
  onCompositionStart,
  onCompositionEnd,
  ...inputProps
}: {
  repoId: string
  storeValue: string
  onTextChange: (text: string) => void
} & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>): React.JSX.Element {
  const [draft, setDraft] = useState<RepoTextDraft>({ repoId, text: storeValue })
  const pendingStoreEchoesRef = useRef<string[]>([])
  // Why: IME composition (e.g. Japanese kana→kanji conversion) fires input
  // events for unconfirmed text. Persisting those mid-composition writes the
  // pre-confirmation value to the store and its async echo can cancel the
  // composition. Hold persistence until compositionend so only confirmed text
  // reaches updateRepo.
  const composingRef = useRef(false)

  const persist = (text: string): void => {
    pendingStoreEchoesRef.current.push(text)
    onTextChange(text)
  }

  useEffect(() => {
    setDraft((current) => {
      if (current.repoId !== repoId) {
        pendingStoreEchoesRef.current = []
        return { repoId, text: storeValue }
      }
      if (storeValue === current.text) {
        pendingStoreEchoesRef.current = []
        return current
      }
      const pendingEchoIndex = pendingStoreEchoesRef.current.indexOf(storeValue)
      if (pendingEchoIndex !== -1) {
        // Why: queued updateRepo calls can echo older input text after newer
        // keystrokes; accepting that echo re-cancels active IME composition.
        pendingStoreEchoesRef.current.splice(0, pendingEchoIndex + 1)
        return current
      }
      pendingStoreEchoesRef.current = []
      return { repoId, text: storeValue }
    })
  }, [repoId, storeValue])

  const text = draft.repoId === repoId ? draft.text : storeValue
  return (
    <Input
      {...inputProps}
      value={text}
      onChange={(e) => {
        const nextText = e.target.value
        setDraft({ repoId, text: nextText })
        // Why: during composition the input stays live via draft, but the
        // unconfirmed text is not persisted until compositionend.
        if (!composingRef.current) {
          persist(nextText)
        }
      }}
      onCompositionStart={(e) => {
        composingRef.current = true
        onCompositionStart?.(e)
      }}
      onCompositionEnd={(e) => {
        composingRef.current = false
        const nextText = e.currentTarget.value
        setDraft({ repoId, text: nextText })
        persist(nextText)
        onCompositionEnd?.(e)
      }}
    />
  )
}
