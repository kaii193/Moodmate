import { useEffect, useRef } from 'react';
import { DRAGON_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 22;
const EYE_CY = 160;
const EYE_LEFT_CX = 148;
const EYE_RIGHT_CX = 252;
const PUPIL_BASE_R = 11;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 266;
const MOUTH_OPEN_DEPTH = 22;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const EAR_LEFT_PIVOT_X = 92;
const EAR_RIGHT_PIVOT_X = 308;
const EAR_PIVOT_Y = 166;
const CHIN_Y = 288;

export default function Dragon({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...DRAGON_EXPRESSIONS.neutral };
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
      const target = DRAGON_EXPRESSIONS[emotionRef.current] || DRAGON_EXPRESSIONS.neutral;
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
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Chú rồng">
      <defs>
        <linearGradient id="dragonSkin" x1="0" y1="70" x2="0" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#66C7A2" />
          <stop offset="1" stopColor="#2F9A78" />
        </linearGradient>
        <clipPath id="dragonEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="dragonEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <path d="M96 196 L58 168 L96 150 L70 110 L118 112 L112 66 L156 90 L176 50 L200 84 L224 50 L244 90 L288 66 L282 112 L330 110 L304 150 L342 168 L304 196 Z" fill="#E8573F" />
        <path d="M164 100 C156 70 138 50 108 40 C128 60 138 80 142 108 Z" fill="#F2C14E" />
        <path d="M236 100 C244 70 262 50 292 40 C272 60 262 80 258 108 Z" fill="#F2C14E" />
        <g ref={set('earL')}>
          <path d="M92 150 L50 128 L64 160 L50 188 L94 178 Z" fill="#E8573F" />
        </g>
        <g ref={set('earR')}>
          <path d="M308 150 L350 128 L336 160 L350 188 L306 178 Z" fill="#E8573F" />
        </g>
        <path d="M200 92 C272 92 318 130 318 182 C318 216 300 236 284 244 L116 244 C100 236 82 216 82 182 C82 130 128 92 200 92 Z" fill="url(#dragonSkin)" />
        <ellipse cx="200" cy="244" rx="94" ry="46" fill="url(#dragonSkin)" />
        <ellipse cx="200" cy="232" rx="70" ry="26" fill="#9BE0C2" opacity=".55" />
        <ellipse ref={set('blushL')} cx="106" cy="200" rx="14" ry="7" fill="#F59A8C" />
        <ellipse ref={set('blushR')} cx="294" cy="200" rx="14" ry="7" fill="#F59A8C" />

        <Eye cx={EYE_LEFT_CX} clip="dragonEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="dragonEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <ellipse cx="176" cy="226" rx="8" ry="5" fill="#1F5E48" />
        <ellipse cx="224" cy="226" rx="8" ry="5" fill="#1F5E48" />
        <path d="M110 246 C80 252 60 270 50 294 M290 246 C320 252 340 270 350 294" stroke="#F2C14E" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path ref={set('mouth')} fill="#1F3A2E" stroke="#1F3A2E" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
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
          <circle r={PUPIL_BASE_R} fill="#F2C14E" />
          <ellipse rx="3.5" ry="8.5" fill="#1F3A2E" />
          <circle cx="4" cy="-5" r="3" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#dragonSkin)" />
        <path ref={edge} stroke="#1F6B52" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 11} ${EYE_CY + 5} Q${cx} ${EYE_CY - 11} ${cx + 11} ${EYE_CY + 5}`}
        stroke="#1F3A2E" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
