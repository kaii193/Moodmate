import { useEffect, useRef } from 'react';
import { FOX_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 24;
const EYE_CY = 168;
const EYE_LEFT_CX = 146;
const EYE_RIGHT_CX = 254;
const PUPIL_BASE_R = 12;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 254;
const MOUTH_OPEN_DEPTH = 34;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const EAR_PIVOT_Y = 130;
const CHIN_Y = 290;

export default function Fox({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...FOX_EXPRESSIONS.neutral };
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
      el.philtrum.setAttribute('d', `M200 232 L200 ${y + c / 2}`);
    }

    function drawEars(t) {
      const twitch = reduceMotion ? 0 : Math.max(0, Math.sin(t * 0.9) - 0.97) * 120;
      el.earL.setAttribute('transform', `rotate(${-cur.ear - twitch} 120 ${EAR_PIVOT_Y})`);
      el.earR.setAttribute('transform', `rotate(${cur.ear} 280 ${EAR_PIVOT_Y})`);
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
      const target = FOX_EXPRESSIONS[emotionRef.current] || FOX_EXPRESSIONS.neutral;
      for (const k in target) cur[k] = lerp(cur[k], target[k], EXPRESSION_EASE);

      updateBlink(now);
      gaze = readGaze(el.svg, FACE_CENTER, EYE_R - PUPIL_BASE_R);
      const level = levelRef.current ? levelRef.current(t) : 0;
      speakOpen = lerp(speakOpen, level, SPEAK_EASE);

      drawMouth();
      drawEye(EYE_LEFT_CX, true, el.pupilL, el.lidL, el.edgeL, el.arcL);
      drawEye(EYE_RIGHT_CX, false, el.pupilR, el.lidR, el.edgeR, el.arcR);
      el.blushL.setAttribute('opacity', cur.blush);
      el.blushR.setAttribute('opacity', cur.blush);
      drawEars(t);
      drawHead(t);

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const set = (name) => (node) => { r.current[name] = node; };

  return (
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Chú cáo">
      <defs>
        <linearGradient id="foxFur" x1="0" y1="40" x2="0" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F59A4A" />
          <stop offset="1" stopColor="#DC6A22" />
        </linearGradient>
        <clipPath id="foxEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="foxEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <g ref={set('earL')}>
          <path d="M78 160 L72 34 Q130 52 168 100 Z" fill="url(#foxFur)" />
          <path d="M92 142 L86 64 Q122 78 150 106 Z" fill="#FFE2C8" />
          <path d="M72 34 Q86.5 38.5 99.8 44.9 Q86 54 73.5 66 Z" fill="#4A2A1A" />
        </g>
        <g ref={set('earR')}>
          <path d="M322 160 L328 34 Q270 52 232 100 Z" fill="url(#foxFur)" />
          <path d="M308 142 L314 64 Q278 78 250 106 Z" fill="#FFE2C8" />
          <path d="M328 34 Q313.5 38.5 300.2 44.9 Q314 54 326.5 66 Z" fill="#4A2A1A" />
        </g>

        <path
          d="M200 88 C280 88 332 128 342 182 L362 208 L326 214 C302 252 252 284 200 290 C148 284 98 252 74 214 L38 208 L58 182 C68 128 120 88 200 88 Z"
          fill="url(#foxFur)"
        />
        <path
          d="M58 182 C92 178 140 190 166 214 Q200 236 234 214 C260 190 308 178 342 182 L362 208 L326 214 C302 252 252 284 200 290 C148 284 98 252 74 214 L38 208 Z"
          fill="#FFF6EA"
        />
        <ellipse ref={set('blushL')} cx="112" cy="226" rx="16" ry="8" fill="#F4A3A8" />
        <ellipse ref={set('blushR')} cx="288" cy="226" rx="16" ry="8" fill="#F4A3A8" />

        <Eye cx={EYE_LEFT_CX} clip="foxEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="foxEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <path ref={set('philtrum')} stroke="#3A2418" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M185 216 Q200 209 215 216 Q209 230 200 233 Q191 230 185 216 Z" fill="#2E1C12" />
        <ellipse cx="195" cy="216" rx="4" ry="2.2" fill="#fff" opacity=".7" />
        <path ref={set('mouth')} fill="#3A2418" stroke="#3A2418" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function Eye({ cx, clip, pupil, lid, edge, arc }) {
  return (
    <>
      <circle cx={cx} cy={EYE_CY} r={EYE_R} fill="#FFFBF2" />
      <g clipPath={`url(#${clip})`}>
        <g ref={pupil}>
          <circle r={PUPIL_BASE_R} fill="#2E1C12" />
          <circle cx="4" cy="-4" r="3.5" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#foxFur)" />
        <path ref={edge} stroke="#8A3A12" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 12} ${EYE_CY + 5} Q${cx} ${EYE_CY - 12} ${cx + 12} ${EYE_CY + 5}`}
        stroke="#2E1C12" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
