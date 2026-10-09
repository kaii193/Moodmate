import { useEffect, useRef } from 'react';
import { TIGER_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 22;
const EYE_CY = 166;
const EYE_LEFT_CX = 148;
const EYE_RIGHT_CX = 252;
const PUPIL_BASE_R = 11;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 254;
const MOUTH_OPEN_DEPTH = 28;
const PHILTRUM_TOP_Y = 230;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const EAR_LEFT_PIVOT_X = 114;
const EAR_RIGHT_PIVOT_X = 286;
const EAR_PIVOT_Y = 128;
const CHIN_Y = 288;

export default function Tiger({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...TIGER_EXPRESSIONS.neutral };
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
      el.philtrum.setAttribute('d', `M200 ${PHILTRUM_TOP_Y} L200 ${y + c / 2}`);
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
      const target = TIGER_EXPRESSIONS[emotionRef.current] || TIGER_EXPRESSIONS.neutral;
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
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Chú hổ">
      <defs>
        <linearGradient id="tigerSkin" x1="0" y1="80" x2="0" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F8A845" />
          <stop offset="1" stopColor="#E5781C" />
        </linearGradient>
        <clipPath id="tigerEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="tigerEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <g ref={set('earL')}>
          <circle cx="112" cy="106" r="34" fill="url(#tigerSkin)" />
          <circle cx="112" cy="110" r="18" fill="#FFF3E0" />
        </g>
        <g ref={set('earR')}>
          <circle cx="288" cy="106" r="34" fill="url(#tigerSkin)" />
          <circle cx="288" cy="110" r="18" fill="#FFF3E0" />
        </g>
        <path d="M200 92 C284 92 336 140 336 198 C336 256 276 288 200 288 C124 288 64 256 64 198 C64 140 116 92 200 92 Z" fill="url(#tigerSkin)" />
        <path d="M188 94 L212 94 L200 128 Z M138 114 Q160 122 168 142 Q150 134 132 132 Z M262 114 Q240 122 232 142 Q250 134 268 132 Z" fill="#2B1D14" />
        <path d="M64 184 Q88 186 102 196 Q84 198 66 204 Z M68 216 Q90 216 102 224 Q86 228 74 234 Z M336 184 Q312 186 298 196 Q316 198 334 204 Z M332 216 Q310 216 298 224 Q314 228 326 234 Z" fill="#2B1D14" />
        <path d="M200 204 C238 204 270 220 270 244 C270 270 236 286 200 286 C164 286 130 270 130 244 C130 220 162 204 200 204 Z" fill="#FFF6EA" />
        <ellipse ref={set('blushL')} cx="114" cy="214" rx="14" ry="7" fill="#F4A3A8" />
        <ellipse ref={set('blushR')} cx="286" cy="214" rx="14" ry="7" fill="#F4A3A8" />

        <Eye cx={EYE_LEFT_CX} clip="tigerEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="tigerEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <path ref={set('philtrum')} stroke="#2B1D14" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M186 214 Q200 207 214 214 Q208 228 200 231 Q192 228 186 214 Z" fill="#D9776B" />
        <ellipse cx="195" cy="214" rx="4" ry="2" fill="#fff" opacity=".7" />
        <path ref={set('mouth')} fill="#2B1D14" stroke="#2B1D14" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
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
          <circle r={PUPIL_BASE_R} fill="#2B1D14" />
          <circle cx="4" cy="-4" r="3.3" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#tigerSkin)" />
        <path ref={edge} stroke="#8A3A12" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 11} ${EYE_CY + 5} Q${cx} ${EYE_CY - 11} ${cx + 11} ${EYE_CY + 5}`}
        stroke="#2B1D14" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
