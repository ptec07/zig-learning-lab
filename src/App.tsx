import { useMemo, useState } from 'react'
import './App.css'

const DOC_BASE = 'https://ziglang.org/documentation/master/'
export const STORAGE_KEY = 'zig-learning-lab-progress'

type Lesson = {
  id: string
  title: string
  level: string
  docAnchor: string
  summary: string
  objectives: string[]
  starterCode: string
  check: (code: string) => boolean
  passMessage: string
}

type Progress = {
  completedLessonIds: string[]
  examPassed: boolean
}

type ExamQuestion = {
  id: string
  prompt: string
  correct: string
  wrong: string
  explanation: string
  lessonId: string
}

const emptyProgress: Progress = { completedLessonIds: [], examPassed: false }

const lessons: Lesson[] = [
  {
    id: 'hello-world',
    title: 'Hello World',
    level: '1단계 · 실행 모델',
    docAnchor: 'Hello-World',
    summary: '@import("std"), pub fn main, 출력 함수로 첫 Zig 프로그램을 이해합니다.',
    objectives: ['표준 라이브러리 import', '엔트리 포인트 main', '출력 포맷과 .{} 인자 리스트'],
    starterCode: 'const std = @import("std");\n\npub fn main() void {\n    // std.debug.print를 사용해 Hello, Zig!를 출력하세요.\n}',
    check: (code) => /pub\s+fn\s+main\s*\(/.test(code) && code.includes('std.debug.print'),
    passMessage: '통과: main 함수와 std.debug.print를 확인했습니다.',
  },
  {
    id: 'zig-test',
    title: 'Zig Test',
    level: '2단계 · 테스트 습관',
    docAnchor: 'Zig-Test',
    summary: 'test 블록과 std.testing.expect를 사용해 작은 코드부터 검증합니다.',
    objectives: ['test 선언', 'std.testing.expect', 'zig test 사고방식'],
    starterCode: 'const std = @import("std");\n\ntest "addition" {\n    try std.testing.expect(1 + 1 == 2);\n}',
    check: (code) => /test\s+"/.test(code) && code.includes('std.testing.expect'),
    passMessage: '통과: test 블록과 std.testing.expect를 확인했습니다.',
  },
  {
    id: 'arrays',
    title: 'Arrays',
    level: '3단계 · 값과 메모리',
    docAnchor: 'Arrays',
    summary: '고정 길이 배열, 슬라이스 전 단계의 인덱싱, len 필드를 학습합니다.',
    objectives: ['배열 리터럴', '인덱싱', 'len으로 길이 확인'],
    starterCode: 'const numbers = [_]u8{ 1, 2, 3 };\n// numbers.len과 numbers[0]을 확인하세요.',
    check: (code) => code.includes('[_]') && code.includes('.len'),
    passMessage: '통과: 배열 리터럴과 len 사용을 확인했습니다.',
  },
  {
    id: 'pointers',
    title: 'Pointers',
    level: '4단계 · 참조와 변경',
    docAnchor: 'Pointers',
    summary: '&와 .*를 통해 주소를 얻고 역참조하는 기본 패턴을 익힙니다.',
    objectives: ['주소 연산자 &', '역참조 .*', 'const와 var의 차이'],
    starterCode: 'var x: i32 = 10;\nconst ptr = &x;\nptr.* += 1;',
    check: (code) => code.includes('&') && code.includes('.*'),
    passMessage: '통과: 포인터 주소 획득과 역참조를 확인했습니다.',
  },
  {
    id: 'struct',
    title: 'struct',
    level: '5단계 · 데이터 모델링',
    docAnchor: 'struct',
    summary: '필드와 메서드를 가진 struct로 작은 도메인 모델을 구성합니다.',
    objectives: ['struct 필드 선언', '인스턴스 생성', '메서드의 self 패턴'],
    starterCode: 'const Point = struct {\n    x: f32,\n    y: f32,\n};',
    check: (code) => /struct\s*\{/.test(code) && code.includes(':'),
    passMessage: '통과: struct 선언과 필드를 확인했습니다.',
  },
  {
    id: 'enum',
    title: 'enum',
    level: '6단계 · 상태 표현',
    docAnchor: 'enum',
    summary: 'enum으로 제한된 선택지를 만들고 switch와 결합합니다.',
    objectives: ['enum 선언', '태그 값', 'switch 분기'],
    starterCode: 'const Direction = enum { north, south, east, west };\n// switch로 Direction을 처리하세요.',
    check: (code) => /enum\s*\{/.test(code) && code.includes('switch'),
    passMessage: '통과: enum과 switch 사용을 확인했습니다.',
  },
  {
    id: 'errors',
    title: 'Errors',
    level: '7단계 · 실패 설계',
    docAnchor: 'Errors',
    summary: 'error set, ! 타입, try/catch로 실패를 타입 수준에서 다룹니다.',
    objectives: ['error set', '! 반환 타입', 'try와 catch'],
    starterCode: 'const ParseError = error{InvalidNumber};\nfn parse() ParseError!u8 {\n    return ParseError.InvalidNumber;\n}',
    check: (code) => code.includes('error{') && code.includes('!'),
    passMessage: '통과: error set과 오류 union 타입을 확인했습니다.',
  },
  {
    id: 'comptime',
    title: 'comptime',
    level: '8단계 · 컴파일 타임 사고',
    docAnchor: 'comptime',
    summary: 'comptime 파라미터와 타입 생성을 통해 Zig의 메타프로그래밍을 맛봅니다.',
    objectives: ['comptime 키워드', '타입을 값처럼 다루기', '런타임과 컴파일타임 구분'],
    starterCode: 'fn makeArray(comptime T: type, comptime n: usize) [n]T {\n    return undefined;\n}',
    check: (code) => code.includes('comptime') && code.includes('type'),
    passMessage: '통과: comptime과 type 사용을 확인했습니다.',
  },
]

const examQuestions: ExamQuestion[] = [
  {
    id: 'q1',
    prompt: 'Zig의 표준 라이브러리를 가져오는 대표 구문은?',
    correct: 'const std = @import("std");',
    wrong: 'import std from "zig"',
    explanation: '@import("std")는 컴파일 시점 import로 표준 라이브러리 네임스페이스를 가져오는 Zig의 기본 패턴입니다.',
    lessonId: 'hello-world',
  },
  {
    id: 'q2',
    prompt: 'Zig 공식 문서에서 테스트를 정의하는 키워드는?',
    correct: 'test',
    wrong: 'describe',
    explanation: 'Zig는 test "이름" { ... } 블록을 zig test 명령으로 실행합니다.',
    lessonId: 'zig-test',
  },
  {
    id: 'q3',
    prompt: '포인터가 가리키는 값을 읽거나 바꾸는 연산자는?',
    correct: '.*',
    wrong: '->',
    explanation: 'Zig 포인터는 ptr.* 형태로 역참조하며, C 스타일 -> 연산자를 사용하지 않습니다.',
    lessonId: 'pointers',
  },
  {
    id: 'q4',
    prompt: '실패 가능성을 타입에 표현하는 Zig 문법은?',
    correct: '! 오류 union',
    wrong: 'null only',
    explanation: 'Zig의 오류 union은 ErrorSet!Value 형태로 성공 값과 실패 가능성을 타입에 함께 표현합니다.',
    lessonId: 'errors',
  },
  {
    id: 'q5',
    prompt: '컴파일 타임에 평가되어야 함을 표시하는 키워드는?',
    correct: 'comptime',
    wrong: 'constexpr',
    explanation: 'comptime은 타입 생성과 컴파일 타임 계산을 명시해 Zig의 메타프로그래밍을 가능하게 합니다.',
    lessonId: 'comptime',
  },
]

function normalizeProgress(value: Partial<Progress>): Progress {
  const knownLessonIds = new Set([...lessons.map((lesson) => lesson.id), 'exam-passed'])
  const completedLessonIds = Array.isArray(value.completedLessonIds)
    ? Array.from(new Set(value.completedLessonIds.filter((id): id is string => typeof id === 'string' && knownLessonIds.has(id))))
    : []

  return {
    completedLessonIds,
    examPassed: Boolean(value.examPassed),
  }
}

function readProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyProgress
    return normalizeProgress(JSON.parse(raw) as Partial<Progress>)
  } catch {
    return emptyProgress
  }
}

function writeProgress(progress: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

function serializeProgressBackup(progress: Progress) {
  return JSON.stringify(progress, null, 2)
}

function parseProgressBackup(rawBackup: string): Progress | null {
  try {
    return normalizeProgress(JSON.parse(rawBackup) as Partial<Progress>)
  } catch {
    return null
  }
}

function useProgress() {
  const [progress, setProgress] = useState(readProgress)

  function replaceProgress(nextProgress: Progress) {
    writeProgress(nextProgress)
    setProgress(nextProgress)
  }

  function completeLesson(lessonId: string) {
    setProgress((current) => {
      const next = {
        ...current,
        completedLessonIds: Array.from(new Set([...current.completedLessonIds, lessonId])),
      }
      writeProgress(next)
      return next
    })
  }

  function passExam() {
    setProgress((current) => {
      const next = {
        ...current,
        examPassed: true,
        completedLessonIds: Array.from(new Set([...current.completedLessonIds, 'exam-passed'])),
      }
      writeProgress(next)
      return next
    })
  }

  function resetProgress() {
    replaceProgress(emptyProgress)
  }

  return { progress, completeLesson, passExam, replaceProgress, resetProgress }
}

function currentPath() {
  return window.location.pathname
}

function docUrl(anchor: string) {
  return `${DOC_BASE}#${anchor}`
}

function realCompletedLessonIds(progress: Progress) {
  const lessonIds = new Set(lessons.map((lesson) => lesson.id))
  return progress.completedLessonIds.filter((id) => lessonIds.has(id))
}

function App() {
  const { progress, completeLesson, passExam, replaceProgress, resetProgress } = useProgress()
  const [path, setPath] = useState(currentPath())

  function navigate(event: React.MouseEvent<HTMLAnchorElement>) {
    const href = event.currentTarget.getAttribute('href') ?? '/'
    if (href.startsWith('/')) {
      event.preventDefault()
      window.history.pushState({}, '', href)
      setPath(href)
    }
  }

  const completedCount = realCompletedLessonIds(progress).length
  const progressPercent = Math.round((completedCount / lessons.length) * 100)

  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="/" onClick={navigate} className="brand">⚡ Zig Lab</a>
        <nav aria-label="주요 메뉴">
          <a href="/lessons" onClick={navigate}>커리큘럼</a>
          <a href="/dashboard" onClick={navigate}>대시보드</a>
          <a href="/exam" onClick={navigate}>Exam</a>
          <a href={DOC_BASE} target="_blank" rel="noreferrer">공식 문서</a>
        </nav>
      </header>
      <main>
        {path === '/' && <Home progressPercent={progressPercent} navigate={navigate} />}
        {path === '/lessons' && <LessonsPage navigate={navigate} progress={progress} />}
        {path === '/dashboard' && (
          <DashboardPage
            navigate={navigate}
            progress={progress}
            replaceProgress={replaceProgress}
            resetProgress={resetProgress}
          />
        )}
        {path.startsWith('/lessons/') && <LessonPage lessonId={path.split('/').pop() ?? ''} completeLesson={completeLesson} navigate={navigate} progress={progress} />}
        {path === '/exam' && <ExamPage passExam={passExam} navigate={navigate} />}
      </main>
    </div>
  )
}

function Home({ progressPercent, navigate }: { progressPercent: number; navigate: (event: React.MouseEvent<HTMLAnchorElement>) => void }) {
  return (
    <section className="hero-panel">
      <div>
        <p className="eyebrow">Official-doc guided · 한국어 학습 UX</p>
        <h1>Zig 단계별 학습 랩</h1>
        <p className="lead">
          https://ziglang.org/documentation/master/ 를 기준으로 Hello World부터 comptime까지 점진적으로 배우고,
          브라우저에서 Zig 코드를 점검한 뒤 Exam으로 이해도를 확인합니다.
        </p>
        <div className="actions">
          <a className="primary" href="/lessons" onClick={navigate}>커리큘럼 시작</a>
          <a className="secondary" href="/dashboard" onClick={navigate}>진도 대시보드</a>
          <a className="secondary" href="/exam" onClick={navigate}>Exam 보기</a>
        </div>
      </div>
      <aside className="progress-card" aria-label="학습 진행률">
        <strong>{progressPercent}%</strong>
        <span>완료한 학습 진행률</span>
        <div className="meter"><span style={{ width: `${progressPercent}%` }} /></div>
      </aside>
    </section>
  )
}

function LessonsPage({ navigate, progress }: { navigate: (event: React.MouseEvent<HTMLAnchorElement>) => void; progress: Progress }) {
  return (
    <section className="page-section">
      <div className="section-heading">
        <p className="eyebrow">8-step roadmap</p>
        <h1>Zig 공식 문서 기반 커리큘럼</h1>
        <p>각 단계는 공식 문서 anchor를 연결하고, 코드 실습과 통과 조건을 제공합니다.</p>
      </div>
      <div className="lesson-grid">
        {lessons.map((lesson) => (
          <article className="lesson-card" data-testid="lesson-card" key={lesson.id}>
            <span className="level">{lesson.level}</span>
            <h2>{lesson.title}</h2>
            <p>{lesson.summary}</p>
            <ul>
              {lesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}
            </ul>
            <div className="card-actions">
              <a href={`/lessons/${lesson.id}`} onClick={navigate}>{lesson.title} 학습하기</a>
              <a href={docUrl(lesson.docAnchor)} target="_blank" rel="noreferrer">공식 문서</a>
            </div>
            {progress.completedLessonIds.includes(lesson.id) && <span className="done">완료됨</span>}
          </article>
        ))}
      </div>
    </section>
  )
}

function LessonPage({ lessonId, completeLesson, navigate, progress }: { lessonId: string; completeLesson: (id: string) => void; navigate: (event: React.MouseEvent<HTMLAnchorElement>) => void; progress: Progress }) {
  const lesson = lessons.find((item) => item.id === lessonId) ?? lessons[0]
  const [code, setCode] = useState(lesson.starterCode)
  const [result, setResult] = useState('')
  const isDone = progress.completedLessonIds.includes(lesson.id)

  function runCheck() {
    if (lesson.check(code)) {
      completeLesson(lesson.id)
      setResult(lesson.passMessage)
    } else {
      setResult('아직 실패: 목표 문법을 코드에 반영한 뒤 다시 테스트하세요.')
    }
  }

  return (
    <section className="lesson-layout">
      <article className="lesson-main">
        <a href="/lessons" onClick={navigate}>← 커리큘럼으로</a>
        <p className="eyebrow">{lesson.level}</p>
        <h1>{lesson.title}</h1>
        <p>{lesson.summary}</p>
        <a href={docUrl(lesson.docAnchor)} target="_blank" rel="noreferrer">공식 문서에서 보기</a>
        <h2>학습 목표</h2>
        <ul>{lesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
        {isDone && <p className="done">이 단계는 완료되었습니다.</p>}
      </article>
      <aside className="code-lab">
        <label htmlFor="zig-code">Zig 코드 입력</label>
        <textarea id="zig-code" value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} />
        <button type="button" onClick={runCheck}>테스트 실행</button>
        {result && <output>{result}</output>}
      </aside>
    </section>
  )
}

function ExamPage({ passExam, navigate }: { passExam: () => void; navigate: (event: React.MouseEvent<HTMLAnchorElement>) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [score, setScore] = useState<number | null>(null)

  const percent = useMemo(() => {
    if (score === null) return null
    return Math.round((score / examQuestions.length) * 100)
  }, [score])

  const missedQuestions = useMemo(() => {
    if (score === null) return []
    return examQuestions.filter((question) => answers[question.id] !== question.correct)
  }, [answers, score])

  function grade() {
    const correctCount = examQuestions.filter((question) => answers[question.id] === question.correct).length
    setScore(correctCount)
    if (correctCount / examQuestions.length >= 0.8) passExam()
  }

  return (
    <section className="page-section exam-page">
      <div className="section-heading">
        <p className="eyebrow">Final check</p>
        <h1>Zig 실전 Exam</h1>
        <p>공식 문서 핵심 문법을 이해했는지 5문항으로 점검합니다. 80% 이상이면 수료입니다.</p>
      </div>
      <div className="exam-list">
        {examQuestions.map((question) => (
          <fieldset data-testid="exam-question" key={question.id} className="exam-question">
            <legend>{question.prompt}</legend>
            <label>
              <input type="radio" name={question.id} value={question.correct} onChange={() => setAnswers({ ...answers, [question.id]: question.correct })} />
              정답 · {question.correct}
            </label>
            <label>
              <input type="radio" name={question.id} value={question.wrong} onChange={() => setAnswers({ ...answers, [question.id]: question.wrong })} />
              오답 · {question.wrong}
            </label>
          </fieldset>
        ))}
      </div>
      <button className="primary button" type="button" onClick={grade}>채점하기</button>
      {percent !== null && <div className="exam-result"><strong>{percent}%</strong> {percent >= 80 ? '합격' : '재도전 필요'}</div>}
      {missedQuestions.length > 0 && (
        <section className="review-panel" aria-label="오답 노트">
          <h2>오답 노트</h2>
          <p>틀린 문항은 해당 레슨으로 바로 돌아가 다시 실습할 수 있습니다.</p>
          <div className="review-list">
            {missedQuestions.map((question) => {
              const lesson = lessons.find((item) => item.id === question.lessonId) ?? lessons[0]
              return (
                <article key={question.id} className="review-card">
                  <h3>{question.prompt}</h3>
                  <p>{question.explanation}</p>
                  <a href={`/lessons/${lesson.id}`} onClick={navigate}>{lesson.title} 복습하기</a>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </section>
  )
}

function DashboardPage({
  navigate,
  progress,
  replaceProgress,
  resetProgress,
}: {
  navigate: (event: React.MouseEvent<HTMLAnchorElement>) => void
  progress: Progress
  replaceProgress: (progress: Progress) => void
  resetProgress: () => void
}) {
  const [importText, setImportText] = useState('')
  const [message, setMessage] = useState('')
  const completedIds = realCompletedLessonIds(progress)
  const backupText = serializeProgressBackup(progress)

  function importProgress() {
    const parsed = parseProgressBackup(importText)
    if (!parsed) {
      setMessage('백업 JSON을 읽을 수 없습니다. 형식을 확인하세요.')
      return
    }
    replaceProgress(parsed)
    setImportText('')
    setMessage('백업을 불러왔습니다.')
  }

  function clearProgress() {
    resetProgress()
    setMessage('진행률을 초기화했습니다.')
  }

  return (
    <section className="page-section dashboard-page">
      <div className="section-heading">
        <p className="eyebrow">Local progress</p>
        <h1>진도 대시보드</h1>
        <p>브라우저 localStorage에 저장된 학습 상태를 확인하고 JSON으로 백업/복원합니다.</p>
      </div>
      <div className="dashboard-grid">
        <article className="dashboard-card">
          <h2>{completedIds.length}/{lessons.length} 단계 완료</h2>
          <div className="meter"><span style={{ width: `${Math.round((completedIds.length / lessons.length) * 100)}%` }} /></div>
          <ul className="completion-list">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                {lesson.title} {completedIds.includes(lesson.id) ? '완료' : '진행 전'}
                {!completedIds.includes(lesson.id) && <a href={`/lessons/${lesson.id}`} onClick={navigate}> 이어서 학습</a>}
              </li>
            ))}
          </ul>
        </article>
        <article className="dashboard-card backup-card">
          <h2>진행률 백업</h2>
          <label htmlFor="backup-data">진행률 백업 데이터</label>
          <textarea id="backup-data" readOnly value={backupText} />
          <label htmlFor="backup-import">백업 데이터 붙여넣기</label>
          <textarea id="backup-import" value={importText} onChange={(event) => setImportText(event.target.value)} />
          <div className="actions compact-actions">
            <button className="primary button" type="button" onClick={importProgress}>백업 불러오기</button>
            <button className="secondary button" type="button" onClick={clearProgress}>진행률 초기화</button>
          </div>
          {message && <output>{message}</output>}
        </article>
      </div>
    </section>
  )
}

export default App
