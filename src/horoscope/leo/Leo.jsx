import { useEffect, useRef } from 'react';
import { LEO_EXPRESSIONS } from './expressions.js';
import { usePointerGaze } from '../../hooks/usePointerGaze.js';

const lerp = (a, b, t) => a + (b - a) * t;
const EYE_R = 21;
const EYE_CY = 174;
const EYE_LEFT_CX = 156;
const EYE_RIGHT_CX = 244;
const PUPIL_BASE_R = 11;
const FACE_CENTER = { x: (EYE_LEFT_CX + EYE_RIGHT_CX) / 2, y: EYE_CY };
const MOUTH_Y = 250;
const MOUTH_OPEN_DEPTH = 22;
const PHILTRUM_TOP_Y = 230;
const EXPRESSION_EASE = 0.14;
const BLINK_EASE = 0.45;
const SPEAK_EASE = 0.35;
const BLINK_MS = 150;
const EAR_LEFT_PIVOT_X = 130;
const EAR_RIGHT_PIVOT_X = 270;
const EAR_PIVOT_Y = 118;
const CHIN_Y = 276;

export default function Leo({ emotion = 'neutral', getSpeakLevel }) {
  const r = useRef({});
  const emotionRef = useRef(emotion);
  const levelRef = useRef(getSpeakLevel);
  const readGaze = usePointerGaze();

  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { levelRef.current = getSpeakLevel; }, [getSpeakLevel]);

  useEffect(() => {
    const el = r.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = { ...LEO_EXPRESSIONS.neutral };
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
      const target = LEO_EXPRESSIONS[emotionRef.current] || LEO_EXPRESSIONS.neutral;
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
    <svg ref={set('svg')} className="frog" viewBox="24 22 352 270" role="img" aria-label="Sư Tử">
      <defs>
        <linearGradient id="leoSkin" x1="0" y1="104" x2="0" y2="276" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F8CB62" />
          <stop offset="1" stopColor="#E9A53A" />
        </linearGradient>
        <clipPath id="leoEyeClipL"><circle cx={EYE_LEFT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
        <clipPath id="leoEyeClipR"><circle cx={EYE_RIGHT_CX} cy={EYE_CY} r={EYE_R} /></clipPath>
      </defs>

      <g ref={set('head')}>
        <circle cx="324" cy="184" r="34" fill="#C9652A" />
        <circle cx="315" cy="216" r="34" fill="#C9652A" />
        <circle cx="288" cy="243" r="34" fill="#C9652A" />
        <circle cx="247" cy="262" r="34" fill="#C9652A" />
        <circle cx="200" cy="268" r="34" fill="#C9652A" />
        <circle cx="153" cy="262" r="34" fill="#C9652A" />
        <circle cx="112" cy="243" r="34" fill="#C9652A" />
        <circle cx="85" cy="216" r="34" fill="#C9652A" />
        <circle cx="76" cy="184" r="34" fill="#C9652A" />
        <circle cx="85" cy="152" r="34" fill="#C9652A" />
        <circle cx="112" cy="125" r="34" fill="#C9652A" />
        <circle cx="153" cy="106" r="34" fill="#C9652A" />
        <circle cx="200" cy="100" r="34" fill="#C9652A" />
        <circle cx="247" cy="106" r="34" fill="#C9652A" />
        <circle cx="288" cy="125" r="34" fill="#C9652A" />
        <circle cx="315" cy="152" r="34" fill="#C9652A" />
        <circle cx="301" cy="202" r="26" fill="#E08A3A" />
        <circle cx="281" cy="230" r="26" fill="#E08A3A" />
        <circle cx="245" cy="249" r="26" fill="#E08A3A" />
        <circle cx="200" cy="256" r="26" fill="#E08A3A" />
        <circle cx="155" cy="249" r="26" fill="#E08A3A" />
        <circle cx="119" cy="230" r="26" fill="#E08A3A" />
        <circle cx="99" cy="202" r="26" fill="#E08A3A" />
        <circle cx="99" cy="170" r="26" fill="#E08A3A" />
        <circle cx="119" cy="142" r="26" fill="#E08A3A" />
        <circle cx="155" cy="123" r="26" fill="#E08A3A" />
        <circle cx="200" cy="116" r="26" fill="#E08A3A" />
        <circle cx="245" cy="123" r="26" fill="#E08A3A" />
        <circle cx="281" cy="142" r="26" fill="#E08A3A" />
        <circle cx="301" cy="170" r="26" fill="#E08A3A" />
        <g ref={set('earL')}>
          <circle cx="130" cy="118" r="22" fill="url(#leoSkin)" />
          <circle cx="130" cy="120" r="11" fill="#F4C49A" />
        </g>
        <g ref={set('earR')}>
          <circle cx="270" cy="118" r="22" fill="url(#leoSkin)" />
          <circle cx="270" cy="120" r="11" fill="#F4C49A" />
        </g>
        <path d="M200 104 C266 104 300 142 300 192 C300 246 258 276 200 276 C142 276 100 246 100 192 C100 142 134 104 200 104 Z" fill="url(#leoSkin)" />
        <ellipse cx="184" cy="240" rx="22" ry="16" fill="#FFF3DC" />
        <ellipse cx="216" cy="240" rx="22" ry="16" fill="#FFF3DC" />
        <ellipse ref={set('blushL')} cx="124" cy="214" rx="13" ry="7" fill="#F4A3A8" />
        <ellipse ref={set('blushR')} cx="276" cy="214" rx="13" ry="7" fill="#F4A3A8" />

        <Eye cx={EYE_LEFT_CX} clip="leoEyeClipL" pupil={set('pupilL')} lid={set('lidL')} edge={set('edgeL')} arc={set('arcL')} />
        <Eye cx={EYE_RIGHT_CX} clip="leoEyeClipR" pupil={set('pupilR')} lid={set('lidR')} edge={set('edgeR')} arc={set('arcR')} />

        <path ref={set('philtrum')} stroke="#3A2210" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M186 214 Q200 207 214 214 Q208 228 200 231 Q192 228 186 214 Z" fill="#6B3A1E" />
        <ellipse cx="195" cy="214" rx="4" ry="2" fill="#fff" opacity=".6" />
        <path ref={set('mouth')} fill="#3A2210" stroke="#3A2210" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
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
          <circle r={PUPIL_BASE_R} fill="#3A2210" />
          <circle cx="4" cy="-4" r="3.3" fill="#fff" />
        </g>
        <path ref={lid} fill="url(#leoSkin)" />
        <path ref={edge} stroke="#A8661E" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <path
        ref={arc}
        d={`M${cx - 11} ${EYE_CY + 5} Q${cx} ${EYE_CY - 11} ${cx + 11} ${EYE_CY + 5}`}
        stroke="#3A2210" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0"
      />
    </>
  );
}
