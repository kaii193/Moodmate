import { useEffect, useRef } from 'react';
import { PISCES_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 22;
const EYE_CY = 176;
const EYE_LEFT_CX = 154;
const EYE_RIGHT_CX = 246;
const PUPIL_BASE_R = 12;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 242;
const MOUTH_OPEN_DEPTH = 24;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const EAR_LEFT_PIVOT_X = 82;
const EAR_RIGHT_PIVOT_X = 318;
const EAR_PIVOT_Y = 200;
const CHIN_Y = 284;

export default function Pisces({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...PISCES_EXPRESSIONS.neutral };
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

    function drawEars(t) {
      const twitch = reduceMotion ? 0 : Math.max(0, Math.sin(t * 0.9) - 0.97) * 120;
      el.earL.setAttribute('transform', `rotate(${-cur.ear - twitch} ${EAR_LEFT_PIVOT_X} ${EAR_PIVOT_Y})`);
      el.earR.setAttribute('transform', `rotate(${cur.ear} ${EAR_RIGHT_PIVOT_X} ${EAR_PIVOT_Y})`);
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
      const target = PISCES_EXPRESSIONS[emotionRef.current] || PISCES_EXPRESSIONS.neutral;
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
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Song Ngư">
      <defs>
        <linearGradient id="piscesSkin" x1="0" y1="100" x2="0" y2="284" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6FD3D6" />
          <stop offset="1" stopColor="#7C83E8" />
        </linearGradient>
        <clipPath id="piscesEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="piscesEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <circle cx="334" cy="92" r="11" fill="#fff" fillOpacity=".35" stroke="#fff" strokeWidth="2" />
        <circle cx="352" cy="62" r="7" fill="#fff" fillOpacity=".35" stroke="#fff" strokeWidth="2" />
        <circle cx="322" cy="48" r="4" fill="#fff" fillOpacity=".35" stroke="#fff" strokeWidth="2" />
        <path d="M146 112 C156 72 188 50 232 52 C220 68 222 88 254 112 Z" fill="#F28AB2" />
        <path d="M180 104 L196 66 M210 104 L216 60 M236 106 L234 70" stroke="#E06A98" strokeWidth="3" strokeLinecap="round" />
        <g ref={set('earL')}>
          <path d="M84 190 C52 168 30 178 24 200 C30 224 52 232 84 212 Z" fill="#F28AB2" />
          <path d="M80 196 L36 188 M80 202 L32 202 M80 208 L36 216" stroke="#E06A98" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <g ref={set('earR')}>
          <path d="M316 190 C348 168 370 178 376 200 C370 224 348 232 316 212 Z" fill="#F28AB2" />
          <path d="M320 196 L364 188 M320 202 L368 202 M320 208 L364 216" stroke="#E06A98" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <path d="M200 102 C280 102 324 148 324 200 C324 254 276 284 200 284 C124 284 76 254 76 200 C76 148 120 102 200 102 Z" fill="url(#piscesSkin)" />
        <path d="M140 268 Q152 256 164 268 M164 268 Q176 256 188 268 M188 268 Q200 256 212 268 M212 268 Q224 256 236 268 M236 268 Q248 256 260 268" stroke="#A9B0F5" strokeWidth="3" strokeLinecap="round" fill="none" />
        <ellipse ref={set('blushL')} cx="118" cy="214" rx="15" ry="8" fill="#F59AC0" />
        <ellipse ref={set('blushR')} cx="282" cy="214" rx="15" ry="8" fill="#F59AC0" />

        <Eye cx={EYE_LEFT_CX} clip="piscesEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="piscesEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />


        <path ref={set('mouth')} fill="#1E2350" stroke="#1E2350" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
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
          <circle r={PUPIL_BASE_R} fill="#1E2350" />
          <circle cx="4" cy="-4" r="3.6" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#piscesSkin)" />
        <path ref={edge} stroke="#4A54B0" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 11} ${EYE_CY + 5} Q${cx} ${EYE_CY - 11} ${cx + 11} ${EYE_CY + 5}`}
        stroke="#1E2350" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
