import { useEffect, useRef } from 'react';
import { GOAT_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 21;
const EYE_CY = 164;
const EYE_LEFT_CX = 150;
const EYE_RIGHT_CX = 250;
const PUPIL_BASE_R = 11;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 238;
const MOUTH_OPEN_DEPTH = 20;
const PHILTRUM_TOP_Y = 224;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const EAR_LEFT_PIVOT_X = 104;
const EAR_RIGHT_PIVOT_X = 296;
const EAR_PIVOT_Y = 160;
const CHIN_Y = 262;

export default function Goat({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...GOAT_EXPRESSIONS.neutral };
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
      const target = GOAT_EXPRESSIONS[emotionRef.current] || GOAT_EXPRESSIONS.neutral;
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
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Chú dê">
      <defs>
        <linearGradient id="goatSkin" x1="0" y1="80" x2="0" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F7F3EA" />
          <stop offset="1" stopColor="#DCD3C0" />
        </linearGradient>
        <clipPath id="goatEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="goatEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <path d="M168 102 C150 62 108 52 86 72 C104 68 128 78 146 110 Z" fill="#C9B48E" />
        <path d="M232 102 C250 62 292 52 314 72 C296 68 272 78 254 110 Z" fill="#C9B48E" />
        <g ref={set('earL')}>
          <path d="M104 152 C72 146 48 156 38 172 C62 182 86 178 106 170 Z" fill="url(#goatSkin)" stroke="#D8CFBB" strokeWidth="3" />
          <path d="M96 157 C76 154 60 160 52 169 C68 174 84 172 98 167 Z" fill="#F2C7C2" />
        </g>
        <g ref={set('earR')}>
          <path d="M296 152 C328 146 352 156 362 172 C338 182 314 178 294 170 Z" fill="url(#goatSkin)" stroke="#D8CFBB" strokeWidth="3" />
          <path d="M304 157 C324 154 340 160 348 169 C332 174 316 172 302 167 Z" fill="#F2C7C2" />
        </g>
        <path d="M180 256 Q200 302 220 256 Z" fill="#E8E1D0" />
        <path d="M200 92 C266 92 306 130 306 180 C306 222 278 250 238 262 L162 262 C122 250 94 222 94 180 C94 130 134 92 200 92 Z" fill="url(#goatSkin)" stroke="#D8CFBB" strokeWidth="3" />
        <circle cx="184" cy="104" r="14" fill="#FFFDF8" />
        <circle cx="216" cy="104" r="14" fill="#FFFDF8" />
        <circle cx="200" cy="98" r="15" fill="#FFFDF8" />
        <ellipse ref={set('blushL')} cx="118" cy="206" rx="14" ry="7" fill="#F4AFB4" />
        <ellipse ref={set('blushR')} cx="282" cy="206" rx="14" ry="7" fill="#F4AFB4" />

        <Eye cx={EYE_LEFT_CX} clip="goatEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="goatEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <path ref={set('philtrum')} stroke="#3A3226" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M190 214 Q200 210 210 214 Q205 222 200 224 Q195 222 190 214 Z" fill="#E6A0A6" />
        <path ref={set('mouth')} fill="#3A3226" stroke="#3A3226" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
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
          <circle r={PUPIL_BASE_R} fill="#E0A93B" />
          <rect x="-8" y="-2.5" width="16" height="5" rx="2.5" fill="#2E2A22" />
          <circle cx="4" cy="-5" r="3" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#goatSkin)" />
        <path ref={edge} stroke="#A89E88" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 11} ${EYE_CY + 5} Q${cx} ${EYE_CY - 11} ${cx + 11} ${EYE_CY + 5}`}
        stroke="#3A3226" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
