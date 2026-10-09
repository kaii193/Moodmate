import { useEffect, useRef } from 'react';
import { SAGITTARIUS_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 20;
const EYE_CY = 178;
const EYE_LEFT_CX = 154;
const EYE_RIGHT_CX = 246;
const PUPIL_BASE_R = 11;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 242;
const MOUTH_OPEN_DEPTH = 24;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const EAR_LEFT_PIVOT_X = 152;
const EAR_RIGHT_PIVOT_X = 248;
const EAR_PIVOT_Y = 98;
const CHIN_Y = 288;

export default function Sagittarius({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...SAGITTARIUS_EXPRESSIONS.neutral };
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
      const target = SAGITTARIUS_EXPRESSIONS[emotionRef.current] || SAGITTARIUS_EXPRESSIONS.neutral;
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
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Nhân Mã">
      <defs>
        <linearGradient id="sagittariusSkin" x1="0" y1="80" x2="0" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFE3CC" />
          <stop offset="1" stopColor="#F6C6A2" />
        </linearGradient>
        <clipPath id="sagittariusEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="sagittariusEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <path d="M58 272 L338 54" stroke="#6B4A2A" strokeWidth="7" strokeLinecap="round" />
        <path d="M350 44 L318 50 L342 76 Z" fill="#9AA4B2" stroke="#6E7884" strokeWidth="2" strokeLinejoin="round" />
        <path d="M66 266 L40 262 L48 284 Z M80 256 L56 246 L58 270 Z" fill="#E5483C" />
        <g ref={set('earL')}>
          <path d="M138 112 Q126 72 136 34 Q166 58 174 98 Z" fill="#A86434" />
          <path d="M146 102 Q140 76 144 54 Q160 70 164 96 Z" fill="#E8C4A4" />
        </g>
        <g ref={set('earR')}>
          <path d="M262 112 Q274 72 264 34 Q234 58 226 98 Z" fill="#A86434" />
          <path d="M254 102 Q260 76 256 54 Q240 70 236 96 Z" fill="#E8C4A4" />
        </g>
        <path d="M200 98 C270 98 312 142 312 198 C312 254 264 288 200 288 C136 288 88 254 88 198 C88 142 130 98 200 98 Z" fill="url(#sagittariusSkin)" />
        <path d="M200 84 C134 84 90 124 88 178 C102 150 128 134 148 130 L160 146 L176 128 L196 146 L214 126 L232 144 L248 128 C276 136 298 154 312 178 C310 124 266 84 200 84 Z" fill="#8A4B24" />
        <ellipse ref={set('blushL')} cx="122" cy="214" rx="14" ry="7" fill="#F49A9A" />
        <ellipse ref={set('blushR')} cx="278" cy="214" rx="14" ry="7" fill="#F49A9A" />

        <Eye cx={EYE_LEFT_CX} clip="sagittariusEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="sagittariusEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <path d="M195 214 Q200 219 205 214" stroke="#C98B6A" strokeWidth="3" strokeLinecap="round" fill="none" />
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
          <circle r={PUPIL_BASE_R} fill="#3A2418" />
          <circle cx="4" cy="-4" r="3.3" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#sagittariusSkin)" />
        <path ref={edge} stroke="#C98B6A" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 10} ${EYE_CY + 5} Q${cx} ${EYE_CY - 10} ${cx + 10} ${EYE_CY + 5}`}
        stroke="#3A2418" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
