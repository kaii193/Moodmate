import { useEffect, useRef } from 'react';
import { CAT_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 23;
const EYE_CY = 170;
const EYE_LEFT_CX = 148;
const EYE_RIGHT_CX = 252;
const PUPIL_BASE_R = 12;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 248;
const MOUTH_OPEN_DEPTH = 26;
const PHILTRUM_TOP_Y = 228;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const EAR_LEFT_PIVOT_X = 132;
const EAR_RIGHT_PIVOT_X = 268;
const EAR_PIVOT_Y = 128;
const CHIN_Y = 286;

export default function Cat({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...CAT_EXPRESSIONS.neutral };
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
      const target = CAT_EXPRESSIONS[emotionRef.current] || CAT_EXPRESSIONS.neutral;
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
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Chú mèo">
      <defs>
        <linearGradient id="catSkin" x1="0" y1="80" x2="0" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F3E0C2" />
          <stop offset="1" stopColor="#E0C095" />
        </linearGradient>
        <clipPath id="catEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="catEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <g ref={set('earL')}>
          <path d="M92 150 Q96 90 108 50 Q150 70 174 106 Z" fill="url(#catSkin)" />
          <path d="M108 132 Q110 96 116 74 Q142 88 158 108 Z" fill="#F6B8C4" />
        </g>
        <g ref={set('earR')}>
          <path d="M308 150 Q304 90 292 50 Q250 70 226 106 Z" fill="url(#catSkin)" />
          <path d="M292 132 Q290 96 284 74 Q258 88 242 108 Z" fill="#F6B8C4" />
        </g>
        <path d="M200 92 C280 92 334 136 336 196 C338 254 278 286 200 286 C122 286 62 254 64 196 C66 136 120 92 200 92 Z" fill="url(#catSkin)" />
        <path d="M200 98 L200 122 M182 102 L186 120 M218 102 L214 120" stroke="#C49A66" strokeWidth="5" strokeLinecap="round" fill="none" />
        <ellipse cx="184" cy="236" rx="22" ry="16" fill="#FFF8EE" />
        <ellipse cx="216" cy="236" rx="22" ry="16" fill="#FFF8EE" />
        <ellipse ref={set('blushL')} cx="106" cy="218" rx="16" ry="8" fill="#F4A3B4" />
        <ellipse ref={set('blushR')} cx="294" cy="218" rx="16" ry="8" fill="#F4A3B4" />

        <Eye cx={EYE_LEFT_CX} clip="catEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="catEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <path ref={set('philtrum')} stroke="#3A2A1E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M162 232 L110 224 M162 240 L108 246 M238 232 L290 224 M238 240 L292 246" stroke="#B89A78" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M190 218 Q200 213 210 218 Q205 227 200 229 Q195 227 190 218 Z" fill="#F08FA0" />
        <path ref={set('mouth')} fill="#3A2A1E" stroke="#3A2A1E" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
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
          <circle r={PUPIL_BASE_R} fill="#7DBB5A" />
          <ellipse rx="3.5" ry="8.5" fill="#1E2A1A" />
          <circle cx="4" cy="-5" r="3" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#catSkin)" />
        <path ref={edge} stroke="#A07A50" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 12} ${EYE_CY + 5} Q${cx} ${EYE_CY - 12} ${cx + 12} ${EYE_CY + 5}`}
        stroke="#3A2A1E" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
