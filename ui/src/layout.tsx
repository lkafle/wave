import { default as React } from 'react'
import { stylesheet } from 'typestyle'
import { CardMenu } from './card_menu'
import { format, isFormatExpr } from './intl'
import { B, bond, box, C, Card, Dict, F, on, Page, parseI, parseU, Rec, S, U, unpack, xid } from './qd'
import { clas, getTheme, palette } from './theme'

type Slot = {
  x: U
  y: U
  w: U
  h: U
}

export enum CardEffect { Transparent, Normal, Raised, Flat }

const
  newCardRegistry = () => {
    const
      m: Dict<{ ctor: typeof React.Component, effect: CardEffect }> = {},
      register = (name: S, ctor: typeof React.Component, effect: CardEffect = CardEffect.Normal) => m[name] = { ctor, effect },
      lookup = (name: S) => m[name] || m['']
    return { register, lookup }
  }

export const
  cards = newCardRegistry(),
  substitute = (formatString?: S, data?: Rec, defaultValue: any = null) => {
    return (formatString !== undefined && formatString !== null)
      ? isFormatExpr(formatString)
        ? format(formatString.substr(1), data)
        : formatString
      : (defaultValue !== undefined && defaultValue !== null)
        ? defaultValue
        : null
  },
  Format = ({ data, defaultValue: v, format: f }: { data?: Rec, defaultValue?: any, format?: S }) => {
    const x = substitute(f, data, v)
    return x === null ? x : <>{x}</>
  },
  CardView = ({ card }: { card: Card<any> }) => {
    const Tag = cards.lookup(card.state.view).ctor
    return <Tag {...card} />
  },
  Repeat = ({ view, props, data }: { view: S | any, props: any, data: any }) => {
    const items = unpack<Rec[]>(data).map((r, i) => {
      const card: Card<any> = {
        name: xid(),
        state: { ...unpack<Rec>(props), view, data: r },
        changed: box<B>(),
      }
      return <CardView key={i} card={card} />
    })
    return <>{items}</>
  }

type Size = [U, U]

export interface Grid {
  /**
   * The minimum viewport width at which to use this grid.
   * Values must be pixel widths (e.g. '0px', '576px', '768px') or a named preset.
   * The named presets are:
   * 'xs': '0px' for extra small devices (portrait phones),
   * 's': '576px' for small devices (landscape phones),
   * 'm': '768px' for medium devices (tablets),
   * 'l': '992px' for large devices (desktops),
   * 'xl': '1200px' for extra large devices (large desktops).
   *
   * A breakpoint value of 'xs' (or '0') matches all viewport widths, unless other breakpoints are set.
  */
  breakpoint: S
  /** The specifications for the columns in this grid. Defaults to 12 columns, each set to `1fr` (1 fraction, or 1/12th grid width). */
  columns: S[]
  /** The specifications for rows in this grid. Defaults to 10 rows, each set to `1fr` (1 fraction, or 1/10th grid height).*/
  rows: S[]
  /** The width of the grid. Defaults to `100%`. */
  width?: S
  /**
   * The minimum width of the grid.
   * Not specifying a min_width will make the grid width equal to the viewport width
   * if the grid width exceeds the available viewport width.
   **/
  min_width?: S
  /** The height of the grid. Defaults to `auto`. */
  height?: S
  /** The minimum height of the grid. */
  min_height?: S
  /** The left margin. */
  margin_left?: S
  /** The top margin. */
  margin_top?: S
  /** The right margin. */
  margin_right?: S
  /** The bottom margin. */
  margin_bottom?: S
}

const
  gridGap = 15,
  presetBreakpoints: Dict<S> = {
    xs: '0px',
    s: '576px',
    m: '768px',
    l: '992px',
    xl: '1200px',
  },
  repeat = <T extends {}>(n: U, x: T): T[] => {
    const xs = new Array<T>(n)
    for (let i = 0; i < n; i++) xs[i] = x
    return xs
  },
  defaultGrid: Grid = {
    breakpoint: 'xs', // any width
    columns: repeat(12, '1fr'),
    rows: repeat(10, '1fr'),
    width: '1773px', // 134*12 + 15*(12-1)
    min_width: '1773px',
    height: '895px', // 76*10 + 15*(10-1)
  },
  badPlacement: Slot = { x: 0, y: 0, w: 0, h: 0 },
  normalize = (s: S): S[] => {
    const x = s.trim().split(/\s+/g)
    switch (x.length) {
      case 1: return ['1', '1', s, s]
      case 2: return ['1', '1', ...x]
      case 3: return [...x, x[2]]
      case 4: return x
      default: return x.slice(0, 4)
    }
  },
  toGridTemplate = (specs: S[]): S => specs.map(s => {
    const u = parseU(s)
    return isNaN(u) ? s : `${u}fr`
  }).join(' '),
  parseBreakpoint = (spec: S): U => parseInt(presetBreakpoints[spec] ?? spec, 10),
  parseBox = (grid: Grid, index: U, spec: S): Slot => {
    if (!spec) return badPlacement

    const s = spec.split(/\s*\/\s*/)[index]

    if (!s) return badPlacement

    const [x, y, w, h] = normalize(s).map(parseI)

    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) return badPlacement

    return {
      x,
      y,
      w: w > 0 ? w : grid.columns.length + w, // XXX breaks backward compatibility
      h: h > 0 ? h : grid.rows.length + h, // XXX breaks backward compatibility
    }
  },
  newGrid = (uw: U, uh: U, cols: U, rows: U, gap: U) => { // XXX remove
    let scale = 1
    const
      iw = uw - 2 * gap, // unit inner width
      ih = uh - 2 * gap, // unit inner height
      width = uw * cols + gap * (cols + 1),
      height = uh * rows + gap * (rows + 1),
      giw = width - 2 * gap,
      gih = height - 2 * gap,
      getWindowSize = (): Size => ([
        window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
        window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight
      ]),
      rescale = (): F => {
        const [w, h] = getWindowSize()
        scale = Math.min(w / width, h / height)
        return scale
      },
      inset: React.CSSProperties = ({ position: 'absolute', left: gap, top: gap, right: gap, bottom: gap, overflow: 'auto' })

    return {
      width, height,
      innerWidth: giw, innerHeight: gih,
      unitWidth: uw, unitHeight: uh,
      unitInnerWidth: iw, unitInnerHeight: ih,
      gap, scale, rescale, inset, cols, rows
    }
  }


export const // XXX remove
  grid = newGrid(134, 76, 12, 10, gridGap) // approx 1800x930

type Breakpoint = {
  grid: Grid
  min: U
  max: U
  listener(e: MediaQueryListEvent): void
  mq: MediaQueryList
}

export const
  gridsB = box([defaultGrid])

const
  breakpointsB = box<Breakpoint[]>([]),
  gridB = box<{ grid: Grid, index: U }>({ grid: defaultGrid, index: 0 })

on(gridsB, grids => {
  const
    bps = grids.map((grid, index): Breakpoint => {
      const
        g2 = grids[index + 1],
        min = parseBreakpoint(grid.breakpoint),
        max = g2 ? parseBreakpoint(g2.breakpoint) - 1 : 0, // next breakpoint's min
        mq = window.matchMedia(
          max
            ? `(min-width:${min}px) and (max-width:${max}.98px)`
            : `(min-width:${min}px)`
        ),
        listener = (mq: MediaQueryListEvent) => { if (mq.matches) gridB({ grid, index }) },
        bp: Breakpoint = { grid, min, max, mq, listener }

      mq.addEventListener('change', listener)
      if (mq.matches) gridB({ grid, index })

      return bp
    })

  for (const { mq, listener } of breakpointsB()) mq.removeEventListener('change', listener)
  breakpointsB(bps)
})

const
  theme = getTheme(),
  css = stylesheet({
    grid: {
      position: 'relative',
      display: 'grid',
      gap: gridGap,
    },
    slot: {
      position: 'relative',
      boxSizing: 'border-box',
      overflow: 'auto',
      transition: 'box-shadow 0.3s cubic-bezier(.25,.8,.25,1)',
      $nest: {
        '>*:first-child': {
          position: 'absolute',
          left: gridGap, top: gridGap, right: gridGap, bottom: gridGap,
        }
      }
    },
    raised: {
      color: theme.colors.card,
      backgroundColor: palette.themePrimary,
      boxShadow: `0px 3px 7px ${theme.colors.text3}`,
    },
    normal: {
      backgroundColor: theme.colors.card,
      boxShadow: `0px 3px 5px ${theme.colors.text0}`,
      $nest: {
        '&:hover': {
          boxShadow: `0px 12px 20px ${theme.colors.text2}`,
        }
      },
    },
    flat: {
      backgroundColor: theme.colors.card,
      boxShadow: `0px 3px 5px ${theme.colors.text0}`,
    },
    flush: {
      $nest: {
        '>*:first-child': {
          position: 'absolute',
          left: 0, top: 0, right: 0, bottom: 0,
        }
      }
    },
  })


export const
  GridSlot = bond(({ c }: { c: C }) => {
    const
      render = () => {
        const
          { grid, index } = gridB(),
          slot = parseBox(grid, index, c.state.box),
          { x, y, w, h } = slot,
          display = slot === badPlacement ? 'none' : 'block',
          zIndex = c.name === '__unhandled_error__' ? 1 : 'initial',
          effect = cards.lookup(c.state.view).effect,
          className = clas(css.slot, effect === CardEffect.Normal
            ? css.normal
            : effect === CardEffect.Raised
              ? css.raised
              : effect == CardEffect.Flat
                ? css.flat : css.flush)
        return (
          <div className={className} style={{
            display,
            gridArea: `${y}/${x}/span ${h}/span ${w}`,
            zIndex,
          }}>
            <CardView card={c} />
            {!!c.state.commands?.length && <CardMenu name={c.name} commands={c.state.commands} changedB={c.changed} />}
          </div>
        )
      }
    return { render, gridB }
  }),
  GridLayout = bond(({ page }: { page: Page }) => {
    const
      { changed } = page,
      render = () => {
        const
          { grid } = gridB(),
          children = page.list().map(c => <GridSlot key={c.id} c={c} />),
          style: React.CSSProperties = {
            gridTemplateColumns: toGridTemplate(grid.columns),
            gridTemplateRows: toGridTemplate(grid.rows),
            width: grid.width ?? '100%',
            minWidth: grid.min_width ?? undefined,
            height: grid.height ?? 'auto',
            minHeight: grid.min_height ?? undefined,
            margin: `${grid.margin_top ?? 0} ${grid.margin_right ?? 0} ${grid.margin_bottom ?? 0} ${grid.margin_left ?? 0}`,
          }
        return (
          <div data-test={page.key} className={css.grid} style={style}>
            {children}
          </div>
        )
      }
    return { render, gridB, changed }
  })
