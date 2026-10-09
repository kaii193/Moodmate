import { useEffect, useRef } from 'react';
import { COFFEE_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 22;
const EYE_CY = 172;
const EYE_LEFT_CX = 152;
const EYE_RIGHT_CX = 248;
const PUPIL_BASE_R = 11;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 222;
const MOUTH_OPEN_DEPTH = 28;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const CHIN_Y = 288;
const CUP_PATH = 'M92 100 L308 100 L279 280 Q278 288 270 288 L130 288 Q122 288 121 280 Z';
const SURFACE_Y = 120;
const SURFACE_LEFT_X = 70;
const SURFACE_RIGHT_X = 330;
const SURFACE_STEP = 20;
const COFFEE_BOTTOM_Y = 300;
const WAVE_AMPLITUDE = 2.5;
const SPEAK_WAVE_AMPLITUDE = 3;
const WAVE_NUMBER = 0.045;
const WAVE_SPEED = 2.2;
const ICE_BOB = 3;
const SPEAK_ICE_BOB = 4;
const ICE_BOB_SPEED = 1.4;
const ICE_TILT_SPEED = 1.1;
const ICE_CUBES = [
  { x: 134, y: 116, angle: -12, phase: 0 },
  { x: 180, y: 112, angle: 8, phase: 2.1 },
  { x: 266, y: 117, angle: 18, phase: 4.2 },
];
const STRAW_SWAY_DEG = 2.5;
const STRAW_SWAY_SPEED = 0.9;
const STRAW_PIVOT = '214 120';
const DROPLET_TRAVEL = 105;
const DROPLET_MAX_OPACITY = 0.8;
const DROPLETS = [
  { x: 122, top: 136, speed: 0.11, phase: 0 },
  { x: 276, top: 136, speed: 0.08, phase: 0.5 },
];

export default function Coffee({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...COFFEE_EXPRESSIONS.neutral };
    let blink = 0, blinkUntil = 0, nextBlink = performance.now() + 1800, speakOpen = 0, gaze = { x: 0, y: 0 }, raf;

    function drawEye(cx, outerIsLeft, pupil, lid, edge, arc) {
      const top = EYE_CY - EYE_R, h = EYE_R * 2, bottom = EYE_CY + EYE_R, half = EYE_R + 4;
      const yO = lerp(top + cur.lidO * h, bottom + 2, blink);
      const yI = lerp(top + cur.lidI * h, bottom + 2, blink);
      const yL = outerIsLeft ? yO : yI;
      const yR = outerIsLeft ? yI : yO;
      lid.setAttribute('d', `M${cx - half} ${top - 4} L${cx + half} ${top - 4} L${cx + half} ${yR} L${cx - half} ${yL} Z`);
      edge.setAttribute('d', `M${cx - half} ${yL} L${cx + half} ${yR}`);
      const lidAmount = Math.max(cur.lidO, cur.lidI, blink);
      edge.setAttribute('opacity', Math.min(1, lidAmount * 8) * (1 - cur.happy));
      lid.setAttribute('opacity', 1 - cur.happy);
      pupil.setAttribute('transform', `translate(${cx + cur.dx + gaze.x} ${EYE_CY + cur.dy + gaze.y}) scale(${cur.pr / PUPIL_BASE_R})`);
      pupil.setAttribute('opacity', 1 - cur.happy);
      arc.setAttribute('opacity', cur.happy);
    }

    function drawMouth() {
      const mo = Math.min(1, cur.mo + speakOpen * 0.75);
      const w = cur.mw + speakOpen * 5, c = cur.mc - speakOpen * 3, y = MOUTH_Y;
      el.mouth.setAttribute('d', `M${200 - w} ${y} Q200 ${y + c} ${200 + w} ${y} Q200 ${y + c + mo * MOUTH_OPEN_DEPTH} ${200 - w} ${y} Z`);
    }

    function drawSurface(t) {
      const amplitude = reduceMotion ? 0 : WAVE_AMPLITUDE + speakOpen * SPEAK_WAVE_AMPLITUDE;
      const points = [];
      for (let x = SURFACE_LEFT_X; x <= SURFACE_RIGHT_X; x += SURFACE_STEP) {
        points.push(`${x} ${(SURFACE_Y + Math.sin(x * WAVE_NUMBER + t * WAVE_SPEED) * amplitude).toFixed(2)}`);
      }
      el.coffee.setAttribute('d', `M${points.join(' L')} L${SURFACE_RIGHT_X} ${COFFEE_BOTTOM_Y} L${SURFACE_LEFT_X} ${COFFEE_BOTTOM_Y} Z`);
    }

    function drawIce(t) {
      const bob = reduceMotion ? 0 : ICE_BOB + speakOpen * SPEAK_ICE_BOB;
      ICE_CUBES.forEach((cube, i) => {
        const dy = Math.sin(t * ICE_BOB_SPEED + cube.phase) * bob;
        const angle = cube.angle + Math.sin(t * ICE_TILT_SPEED + cube.phase) * bob;
        el[`ice${i}`].setAttribute('transform', `translate(${cube.x} ${cube.y + dy}) rotate(${angle})`);
      });
    }

    function drawStraw(t) {
      const sway = reduceMotion ? 0 : Math.sin(t * STRAW_SWAY_SPEED) * STRAW_SWAY_DEG;
      el.straw.setAttribute('transform', `rotate(${sway} ${STRAW_PIVOT})`);
    }

    function drawDroplets(t) {
      if (reduceMotion) return;
      DROPLETS.forEach((drop, i) => {
        const progress = (t * drop.speed + drop.phase) % 1;
        el[`drop${i}`].setAttribute('transform', `translate(${drop.x} ${drop.top + progress * DROPLET_TRAVEL})`);
        el[`drop${i}`].setAttribute('opacity', Math.sin(progress * Math.PI) * DROPLET_MAX_OPACITY);
      });
    }

    function drawHead(t) {
      const breathe = reduceMotion ? 0 : Math.sin(t * 1.6) * 0.012;
      const tilt = reduceMotion ? 0 : cur.tilt;
      el.head.setAttribute(
        'transform',
        `rotate(${tilt} 200 200) translate(200 ${CHIN_Y}) scale(${1 - breathe * 0.5} ${1 + breathe}) translate(-200 -${CHIN_Y})`
      );
    }

    function updateBlink(now) {
      if (now > nextBlink && cur.happy < 0.5) {
        blinkUntil = now + BLINK_MS;
        nextBlink = now + 2200 + Math.random() * 4000;
      }
      blink = lerp(blink, now < blinkUntil ? 1 : 0, BLINK_EASE);
    }

    function frame(now) {
      const t = now / 1000;
      const target = COFFEE_EXPRESSIONS[emotionRef.current] || COFFEE_EXPRESSIONS.neutral;
      for (const k in target) cur[k] = lerp(cur[k], target[k], EXPRESSION_EASE);

      updateBlink(now);
      gaze = readGaze(el.svg, FACE_CENTER, EYE_R - PUPIL_BASE_R);
      const level = levelRef.current ? levelRef.current(t) : 0;
      speakOpen = lerp(speakOpen, level, SPEAK_EASE);

      drawSurface(t);
      drawIce(t);
      drawStraw(t);
      drawDroplets(t);
      drawMouth();
      drawEye(EYE_LEFT_CX, true, el.pupilL, el.lidL, el.edgeL, el.arcL);
      drawEye(EYE_RIGHT_CX, false, el.pupilR, el.lidR, el.edgeR, el.arcR);
      el.blushL.setAttribute('opacity', cur.blush);
      el.blushR.setAttribute('opacity', cur.blush);
      drawHead(t);

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const set = (name) => (node) => { r.current[name] = node; };

  return (
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Ly cà phê sữa đá">
      <defs>
        <linearGradient id="coffeeLiquid" x1="0" y1="115" x2="0" y2="288" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#C99062" />
          <stop offset="0.55" stopColor="#A86A3C" />
          <stop offset="1" stopColor="#7A4523" />
        </linearGradient>
        <clipPath id="coffeeCupInside"><path d={CUP_PATH} /></clipPath>
        <clipPath id="coffeeEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="coffeeEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <path d={CUP_PATH} fill="#FBF7F1" />
        <g ref={set('straw')}>
          <path d="M230 14 L206 236" stroke="#7A1420" strokeWidth="13" strokeLinecap="round" />
          <path d="M227 22 L215 130" stroke="#fff" strokeOpacity=".25" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g clipPath="url(#coffeeCupInside)">
          <path ref={set('coffee')} fill="url(#coffeeLiquid)" />
          {ICE_CUBES.map((cube, i) => (
            <g key={cube.x} ref={set(`ice${i}`)} transform={`translate(${cube.x} ${cube.y}) rotate(${cube.angle})`}>
              <rect x="-15" y="-14" width="30" height="28" rx="7" fill="#fff" fillOpacity=".55" stroke="#fff" strokeOpacity=".9" strokeWidth="2" />
              <path d="M-8 -7 L2 -7" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            </g>
          ))}
        </g>

        <ellipse ref={set('blushL')} cx="124" cy="206" rx="13" ry="7" fill="#F2A08E" />
        <ellipse ref={set('blushR')} cx="276" cy="206" rx="13" ry="7" fill="#F2A08E" />

        <Eye cx={EYE_LEFT_CX} clip="coffeeEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="coffeeEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <path ref={set('mouth')} fill="#3A1B0C" stroke="#3A1B0C" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />

        <path d="M116.5 252 L283.5 252 L279.6 276 L120.4 276 Z" fill="#A31D24" />
        <path d="M117.4 257 L282.6 257 M119.6 271 L280.4 271" stroke="#F3E3C8" strokeWidth="2" />

        {DROPLETS.map((drop, i) => (
          <ellipse key={drop.x} ref={set(`drop${i}`)} rx="3" ry="4.5" fill="#fff" opacity="0" />
        ))}
        <path d="M297 122 L285 214" stroke="#fff" strokeOpacity=".45" strokeWidth="6" strokeLinecap="round" />
        <path d={CUP_PATH} fill="none" stroke="#D6CBBE" strokeWidth="4" strokeLinejoin="round" />

        <path d="M102 92 C104 54 146 44 200 44 C254 44 296 54 298 92 Z" fill="#fff" fillOpacity=".45" stroke="#D6CBBE" strokeWidth="3" />
        <rect x="84" y="90" width="232" height="14" rx="7" fill="#FBF8F4" stroke="#D6CBBE" strokeWidth="3" />
      </g>
    </svg>
  );
}

function Eye({ cx, clip, pupil, lid, edge, arc }) {
  return (
    <>
      <circle cx={cx} cy={EYE_CY} r={EYE_R} fill="#FFF8EE" />
      <g clipPath={`url(#${clip})`}>
        <g ref={pupil}>
          <circle r={PUPIL_BASE_R} fill="#2B160B" />
          <circle cx="4" cy="-4" r="3.5" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#coffeeLiquid)" />
        <path ref={edge} stroke="#5A2E14" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 11} ${EYE_CY + 5} Q${cx} ${EYE_CY - 11} ${cx + 11} ${EYE_CY + 5}`}
        stroke="#2B160B" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
