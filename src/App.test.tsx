import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

const STORAGE_KEY = 'zig-learning-lab-progress'

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('Zig Learning Lab', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.pushState({}, '', '/')
  })

  it('renders a responsive Zig learning home with official documentation source and primary routes', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: /Zig 단계별 학습 랩/i })).toBeInTheDocument()
    expect(screen.getByText(/ziglang.org\/documentation\/master/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /커리큘럼 시작/i })).toHaveAttribute('href', '/lessons')
    expect(screen.getByRole('link', { name: /Exam 보기/i })).toHaveAttribute('href', '/exam')
    expect(screen.getByText(/브라우저에서 Zig 코드를 점검/i)).toBeInTheDocument()
  })

  it('lists a progressive curriculum aligned to Zig master docs with every lesson linking to source docs', () => {
    renderAt('/lessons')

    const lessonCards = screen.getAllByTestId('lesson-card')
    expect(lessonCards).toHaveLength(8)
    expect(screen.getByRole('link', { name: /Hello World 학습하기/i })).toHaveAttribute('href', '/lessons/hello-world')
    expect(screen.getByRole('link', { name: /Zig Test 학습하기/i })).toHaveAttribute('href', '/lessons/zig-test')
    expect(screen.getByRole('link', { name: /comptime 학습하기/i })).toHaveAttribute('href', '/lessons/comptime')

    for (const card of lessonCards) {
      expect(within(card).getByRole('link', { name: /공식 문서/i })).toHaveAttribute(
        'href',
        expect.stringContaining('https://ziglang.org/documentation/master/#'),
      )
    }
  })

  it('opens a lesson, runs a code-checking exercise, and persists completion progress', async () => {
    const user = userEvent.setup()
    renderAt('/lessons/hello-world')

    expect(screen.getByRole('heading', { name: /Hello World/i })).toBeInTheDocument()
    expect(screen.getByText(/std.debug.print/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /공식 문서에서 보기/i })).toHaveAttribute(
      'href',
      'https://ziglang.org/documentation/master/#Hello-World',
    )

    const editor = screen.getByLabelText(/Zig 코드 입력/i)
    fireEvent.change(editor, {
      target: {
        value: 'const std = @import("std");\npub fn main() void {\n    std.debug.print("Hello, Zig!\\n", .{});\n}',
      },
    })
    await user.click(screen.getByRole('button', { name: /테스트 실행/i }))

    expect(screen.getByText(/통과: main 함수와 std.debug.print를 확인했습니다/i)).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toContain('hello-world')
  })

  it('grades an exam and records exam completion when passing', async () => {
    const user = userEvent.setup()
    renderAt('/exam')

    expect(screen.getByRole('heading', { name: /Zig 실전 Exam/i })).toBeInTheDocument()
    const questions = screen.getAllByTestId('exam-question')
    expect(questions.length).toBeGreaterThanOrEqual(5)

    for (const question of questions) {
      await user.click(within(question).getByRole('radio', { name: /정답/i }))
    }
    await user.click(screen.getByRole('button', { name: /채점하기/i }))

    expect(screen.getByText(/합격/i)).toBeInTheDocument()
    expect(screen.getByText(/100%/i)).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toContain('exam-passed')
  })

  it('shows exam explanations and next-study guidance after a failed attempt', async () => {
    const user = userEvent.setup()
    renderAt('/exam')

    const questions = screen.getAllByTestId('exam-question')
    for (const question of questions) {
      await user.click(within(question).getByRole('radio', { name: /오답/i }))
    }
    await user.click(screen.getByRole('button', { name: /채점하기/i }))

    expect(screen.getAllByText(/0%/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/재도전 필요/i)).toBeInTheDocument()
    expect(screen.getByText(/오답 노트/i)).toBeInTheDocument()
    expect(screen.getByText(/@import\("std"\)는 컴파일 시점 import/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Zig Test 복습하기/i })).toHaveAttribute('href', '/lessons/zig-test')
  })

  it('provides a dashboard for local progress backup, restore, and reset without login copy', async () => {
    const user = userEvent.setup()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completedLessonIds: ['hello-world'], examPassed: false }),
    )

    renderAt('/dashboard')

    expect(screen.getByRole('heading', { name: /진도 대시보드/i })).toBeInTheDocument()
    expect(screen.queryByText(/로그인/i)).not.toBeInTheDocument()
    expect(screen.getByText(/1\/8 단계 완료/i)).toBeInTheDocument()
    expect(screen.getByText(/Hello World 완료/i)).toBeInTheDocument()

    const backupBox = screen.getByLabelText(/진행률 백업 데이터/i)
    expect((backupBox as HTMLTextAreaElement).value).toContain('hello-world')

    fireEvent.change(screen.getByLabelText(/백업 데이터 붙여넣기/i), {
      target: {
        value: JSON.stringify({ completedLessonIds: ['hello-world', 'zig-test'], examPassed: true }),
      },
    })
    await user.click(screen.getByRole('button', { name: /백업 불러오기/i }))

    expect(screen.getByText(/백업을 불러왔습니다/i)).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toContain('zig-test')
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"examPassed":true')

    await user.click(screen.getByRole('button', { name: /진행률 초기화/i }))
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"completedLessonIds":[]')
  })
})
