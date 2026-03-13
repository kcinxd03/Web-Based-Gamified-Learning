import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FaBars, FaStop, FaPause, FaPlay, FaTimes } from 'react-icons/fa';
import Phaser from 'phaser';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { gameSessionAPI, quizAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { getDefaultAvatarByGender, getAvatarBgColor, getAvatarSrc } from '../utils/avatar';

const GAMEPLAY_ROOT_ID = 'gameplay-root';

/** Parse 0–100 from localStorage to 0–1; 0 is valid (mute), null/NaN default to 100. */
const parseVolume = (val) => {
  const n = parseInt(val, 10);
  if (Number.isNaN(n) || n < 0) return 1;
  if (n > 100) return 1;
  return n / 100;
};
/** Read sound volume 0–1 from Settings (localStorage). */
const getSoundVolumeLS = () => {
  try {
    return parseVolume(localStorage.getItem('settings_soundVolume'));
  } catch {
    return 1;
  }
};
/** Read music volume 0–1 from Settings (localStorage). */
const getMusicVolumeLS = () => {
  try {
    return parseVolume(localStorage.getItem('settings_musicVolume'));
  } catch {
    return 1;
  }
};

const POINTS_PER_CORRECT = 10;
const HEALTH_MAX = 100;
const HEALTH_DAMAGE_BY_DIFFICULTY = { Easy: 10, Medium: 30, Hard: 50 };
const BOOST_CHANCE = 0.7;
const BOOST_SPEED_DURATION_MS = 10000;
const BOOST_HINT_DURATION_MS = 8000;
const BOOST_HEALTH_RESTORE = 20;
const BOOST_COOLDOWN_MS = 45000; // 45 sec before boost choices can be used again

const GAME_MODAL_TEXT = '#FFFFFF';
const GAME_MODAL_PRIMARY = '#789153';
const GAME_MODAL_SECONDARY = '#8B7745';
const GAME_MODAL_SURFACE = '#8B7745';
const GAME_MODAL_SURFACE_ALT = '#789153';
const GAME_MODAL_OVERLAY = 'rgba(0,0,0,0.72)';
const GAME_MODAL_BORDER = 'rgba(255,255,255,0.18)';
const GAME_MODAL_INPUT_BG = 'rgba(255,255,255,0.14)';
const GAME_MODAL_INPUT_BORDER = 'rgba(255,255,255,0.28)';
const GAME_MODAL_SHADOW = '0 12px 40px rgba(0,0,0,0.38)';

/* Debuff (wrong answer) */
const DEBUFF_SLOW_DURATION_MS = 8000;
const DEBUFF_SLOW_MULTIPLIER = 0.5;
const DEBUFF_CRIPPLED_DURATION_MS = 5000;
const DEBUFF_REVERSED_CONTROLS_DURATION_MS = 5000;
const DEBUFF_EXTRA_HEALTH_DEDUCT = 15;

/* =========================
   PHASER SCENE
========================= */
const PLAYER_SPEED = 90;

/** Set to true to show player collision body and map collision layer in red */
const DEBUG_COLLISION = false;

/** Set to true to show NPC collision bodies in green */
const DEBUG_NPC_COLLISION = false;

/** Set to true to show player width/height on the sprite for debugging */
const DEBUG_PLAYER_SIZE = false;

/** Set to true to show foreground layer bounds and Y band thresholds (for debugging) */
const DEBUG_FOREGROUND = false;

const PLAYER_FRAME_WIDTH = 32;
const PLAYER_FRAME_HEIGHT = 32;

/** NPC sprites: 24 columns, 16x32 per frame (full body, same as player crop). Col 0-5 right, 6-11 back, 12-17 left, 18-23 front. */
const NPC_FRAME_WIDTH = 16;
const NPC_FRAME_HEIGHT = 32;
// Player spritesheet is 32x32 frames, but we render only this cropped region
const PLAYER_CROP_WIDTH = 16;
const PLAYER_CROP_HEIGHT = 32;

/** On-screen size for player */
const CHARACTER_DISPLAY_SIZE = 16;

/** Horizontal offset for the name label (positive = right, negative = left) */
const PLAYER_NAME_OFFSET_X = -5;
/** Pixels above character center for the name label (increase = label higher) */
const PLAYER_NAME_OFFSET_Y = 5;
/** Player name: fixed UI nameplate — same look on every map, does not blend with environment */
const PLAYER_NAME_FONT_SIZE = '8px';
const PLAYER_NAME_FONT_FAMILY = 'Poppins';
const PLAYER_NAME_COLOR = '#ffffff';
const PLAYER_NAME_BG = 'transparent';
const PLAYER_NAME_STROKE = '#000000';
const PLAYER_NAME_STROKE_THICKNESS = 0;
const PLAYER_NAME_PADDING_X = 0;
const PLAYER_NAME_PADDING_Y = 0;
const PLAYER_NAME_SHADOW_OFFSET_X = 0;
const PLAYER_NAME_SHADOW_OFFSET_Y = 2;
const PLAYER_NAME_SHADOW_COLOR = '#000000';
const PLAYER_NAME_SHADOW_BLUR = 0;
const PLAYER_NAME_RESOLUTION = typeof window !== 'undefined' ? Math.max(2, window.devicePixelRatio || 1) : 2;

/** Player uses 32x32 frame cropped to 16x32, so effective on-screen width is half */
const PLAYER_DISPLAY_WIDTH = (CHARACTER_DISPLAY_SIZE * PLAYER_CROP_WIDTH) / PLAYER_FRAME_WIDTH;
const PLAYER_DISPLAY_HEIGHT = CHARACTER_DISPLAY_SIZE;

const MULTIPLAYER_EMIT_INTERVAL_MS = 80;

/** Student camera zoom factor: >1 zooms in (e.g. 2.5 = closer view around player) */
const STUDENT_CAMERA_ZOOM = 3;

class GameScene extends Phaser.Scene {
  constructor(sessionMap) {
    super({ key: 'GameScene' });
    this.sessionMap = sessionMap ?? null;
  }

  preload() {
    this.load.image('city-map', '/Maps/City.png');
    this.load.tilemapTiledJSON('city-map-data', '/Maps/City.json');
    // Fallback foreground image (used when tilemap has no "Foreground" tile layer)
    this.load.image('city-foreground', '/images/City-Foreground.png');
    // Farm map
    this.load.image('farm-map', '/Maps/Farm.png');
    this.load.tilemapTiledJSON('farm-map-data', '/Maps/Farm.json');
    this.load.image('farm-foreground', '/images/Farm-Foreground.png');
    // Temple map
    this.load.image('temple-map', '/Maps/Temple.png');
    this.load.tilemapTiledJSON('temple-map-data', '/Maps/Temple.json');
    this.load.image('temple-foreground', '/images/Temple-Foreground.png');
    this.load.spritesheet('player', '/Characters/player/adam_idle.png', {
      frameWidth: PLAYER_FRAME_WIDTH,
      frameHeight: PLAYER_FRAME_HEIGHT,
    });
    this.load.spritesheet('player-run', '/Characters/player/adam_run.png', {
      frameWidth: PLAYER_FRAME_WIDTH,
      frameHeight: PLAYER_FRAME_HEIGHT,
    });
    this.load.spritesheet('player-amelia', '/Characters/player/Amelia_idle.png', {
      frameWidth: PLAYER_FRAME_WIDTH,
      frameHeight: PLAYER_FRAME_HEIGHT,
    });
    this.load.spritesheet('player-amelia-run', '/Characters/player/Amelia_run.png', {
      frameWidth: PLAYER_FRAME_WIDTH,
      frameHeight: PLAYER_FRAME_HEIGHT,
    });
    this.load.spritesheet('npc-bob', '/Characters/npc/Bob_idle_anim_16x16.png', {
      frameWidth: NPC_FRAME_WIDTH,
      frameHeight: NPC_FRAME_HEIGHT,
    });
    this.load.spritesheet('npc-alex', '/Characters/npc/Alex_idle_anim_16x16.png', {
      frameWidth: NPC_FRAME_WIDTH,
      frameHeight: NPC_FRAME_HEIGHT,
    });
    // Audio from public/Audio
    this.load.audio('sfx-correct', ['/Audio/correct_answer.wav']);
    this.load.audio('sfx-incorrect', ['/Audio/wrong_answer.wav']);
    this.load.audio('sfx-win', ['/Audio/player_win.wav']);
    this.load.audio('sfx-lose', ['/Audio/player_lose.wav']);
    this.load.audio('bgm-city', ['/Audio/Gameboy.mp3']);
    this.load.audio('bgm-farm', ['/Audio/Farm.mp3']);
    this.load.audio('bgm-temple', ['/Audio/Temple.mp3']);
  }

  create() {
    const sessionMap = this.sessionMap ?? this.registry.get('map') ?? this.sys?.game?.config?.map;
    this.getHealth = this.sys?.game?.config?.getHealth || (() => HEALTH_MAX);
    // Read volume directly from localStorage so Settings always applies (avoids config reference issues)
    this.getSoundVolume = () => {
      try {
        return parseVolume(localStorage.getItem('settings_soundVolume'));
      } catch {
        return 1;
      }
    };
    this.getMusicVolume = () => {
      try {
        return parseVolume(localStorage.getItem('settings_musicVolume'));
      } catch {
        return 1;
      }
    };
    const mapId = sessionMap?.id != null ? Number(sessionMap.id) : null;
    const mapName = sessionMap?.name ? String(sessionMap.name).toLowerCase() : '';
    const mapImage = sessionMap?.image ? String(sessionMap.image).toLowerCase() : '';
    // Select map assets by saved map metadata.
    const isFarm = mapId === 3 || mapName.includes('farm') || mapImage.includes('farm');
    const isTemple = mapId === 5 || mapName.includes('temple') || mapImage.includes('temple');
    const mapImageKey = isTemple ? 'temple-map' : isFarm ? 'farm-map' : 'city-map';
    const mapDataKey = isTemple ? 'temple-map-data' : isFarm ? 'farm-map-data' : 'city-map-data';
    const mapForegroundKey = isTemple ? 'temple-foreground' : isFarm ? 'farm-foreground' : 'city-foreground';
    const mapBgmKey = isTemple ? 'bgm-temple' : isFarm ? 'bgm-farm' : 'bgm-city';
    this._bgmKey = mapBgmKey;

    this.cityImage = this.add.image(0, 0, mapImageKey).setOrigin(0).setDepth(0);

    const mapWidth = this.cityImage.width;
    const mapHeight = this.cityImage.height;

    // Start looping map BGM if audio is already unlocked.
    if (this.cache.audio.exists(mapBgmKey)) {
      try {
        const sm = this.sound;
        const alreadyUnlocked = sm && sm.context && sm.context.state !== 'suspended';
        if (alreadyUnlocked) {
          const vol = this.getMusicVolume();
          this._bgmTrack = this.sound.add(mapBgmKey, { loop: true, volume: vol });
          this._bgmTrack.play();
        }
      } catch (e) { /* ignore */ }
    }

    // Set physics world to map size so player stays in bounds
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);

    // 1x1 pixel texture for static collision bodies (Phaser static groups need a texture)
    if (!this.textures.exists('collision-pixel')) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 1, 1);
      this.textures.addCanvas('collision-pixel', canvas);
    }

    // Load map data for collision and foreground layers
    const tilemap = this.make.tilemap({ key: mapDataKey });
    // Tiled object layers use tilemap pixel coordinates, so collision/spawn/NPC objects
    // must all use the same tiled-pixel -> rendered-map scaling to stay perfectly aligned.
    const tiledPixelWidth = tilemap.width * tilemap.tileWidth;
    const tiledPixelHeight = tilemap.height * tilemap.tileHeight;
    const tiledScaleX = tiledPixelWidth > 0 ? mapWidth / tiledPixelWidth : 1;
    const tiledScaleY = tiledPixelHeight > 0 ? mapHeight / tiledPixelHeight : 1;
    const scaleTiledPoint = (pt, layerOffsetX = 0, layerOffsetY = 0) => ({
      x: (pt.x + layerOffsetX) * tiledScaleX,
      y: (pt.y + layerOffsetY) * tiledScaleY,
    });

    let collisionLayer = tilemap.getObjectLayer('Collision');
    let foregroundLayer = tilemap.getObjectLayer('Foreground');

    // Fallback: read object layers from raw map if getObjectLayer returned null (e.g. map format)
    if ((!collisionLayer || !foregroundLayer) && this.cache.tilemap.exists(mapDataKey)) {
      const tilemapData = this.cache.tilemap.get(mapDataKey);
      const raw = tilemapData && tilemapData.data ? tilemapData.data : null;
      const layers = (raw && raw.layers) ? raw.layers : [];
      const findLayer = (name) => layers.find((l) => l.name === name && (l.objects != null || l.type === 'objectlayer' || l.type === 'objectgroup'));
      if (!collisionLayer) collisionLayer = findLayer('Collision') || findLayer('Object Layer 2');
      if (!foregroundLayer) foregroundLayer = findLayer('Foreground');
    }

    // Foreground as tile layer: safely detect if a "Foreground" TILE layer exists (not object layer)
    const foregroundTileLayer = tilemap.getLayer('Foreground');
    let hasForegroundTileLayer = Boolean(
      foregroundTileLayer &&
      foregroundTileLayer.layer &&
      foregroundTileLayer.layer.type === 'tilelayer'
    );
    if (!hasForegroundTileLayer && this.cache.tilemap.exists(mapDataKey)) {
      const tilemapData = this.cache.tilemap.get(mapDataKey);
      const raw = tilemapData && tilemapData.data ? tilemapData.data : null;
      const layers = (raw && raw.layers) ? raw.layers : [];
      const foregroundTileFromRaw = layers.find(
        (l) => l.name === 'Foreground' && (l.type === 'tilelayer' || (l.type === undefined && Array.isArray(l.data)))
      );
      hasForegroundTileLayer = Boolean(foregroundTileFromRaw);
    }
    this._hasForegroundTileLayer = hasForegroundTileLayer;
    if (hasForegroundTileLayer) {
      console.log('[Foreground] Tiled "Foreground" tile layer found; will create layer above player.');
    } else {
      console.log('[Foreground] No "Foreground" tile layer in tilemap; will use fallback image if available.');
    }

    // Collision: use physics static group so collider reliably hits static bodies (positions/sizes scaled to match map image)
    this.collisionBodies = this.physics.add.staticGroup();
    const addCollisionRectWorld = (left, top, width, height) => {
      const w = Math.max(1, width);
      const h = Math.max(1, height);
      const sprite = this.collisionBodies.create(left + w / 2, top + h / 2, 'collision-pixel');
      sprite.setOrigin(0.5, 0.5);
      sprite.setDisplaySize(w, h);
      sprite.setVisible(false);
      sprite.body.setSize(w, h);
      sprite.refreshBody();
    };
    const addCollisionRectTiled = (left, top, width, height) => {
      addCollisionRectWorld(left * tiledScaleX, top * tiledScaleY, width * tiledScaleX, height * tiledScaleY);
    };
    const rotatePoint = (pt, angleDeg) => {
      if (!angleDeg) return { x: pt.x, y: pt.y };
      const rad = Phaser.Math.DegToRad(angleDeg);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: pt.x * cos - pt.y * sin,
        y: pt.x * sin + pt.y * cos,
      };
    };
    const pointInPolygon = (x, y, pts) => {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i].x;
        const yi = pts[i].y;
        const xj = pts[j].x;
        const yj = pts[j].y;
        const intersects = ((yi > y) !== (yj > y))
          && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 0.000001) + xi);
        if (intersects) inside = !inside;
      }
      return inside;
    };
    const rasterizePolygonCollision = (absPoints) => {
      if (!Array.isArray(absPoints) || absPoints.length < 3) return;
      let minX = absPoints[0].x;
      let maxX = absPoints[0].x;
      let minY = absPoints[0].y;
      let maxY = absPoints[0].y;
      for (let i = 1; i < absPoints.length; i++) {
        const p = absPoints[i];
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      const cellW = Math.max(2, (tilemap.tileWidth || 6) / 2);
      const cellH = Math.max(2, (tilemap.tileHeight || 6) / 2);
      for (let rowTop = minY; rowTop < maxY; rowTop += cellH) {
        const rowHeight = Math.min(cellH, maxY - rowTop);
        let runStart = null;
        let runWidth = 0;
        for (let colLeft = minX; colLeft < maxX; colLeft += cellW) {
          const colWidth = Math.min(cellW, maxX - colLeft);
          const cx = colLeft + colWidth / 2;
          const cy = rowTop + rowHeight / 2;
          const inside = pointInPolygon(cx, cy, absPoints);
          if (inside) {
            if (runStart == null) runStart = colLeft;
            runWidth += colWidth;
          } else if (runStart != null) {
            addCollisionRectTiled(runStart, rowTop, runWidth, rowHeight);
            runStart = null;
            runWidth = 0;
          }
        }
        if (runStart != null) addCollisionRectTiled(runStart, rowTop, runWidth, rowHeight);
      }
    };
    const addObjectLayerToCollision = (layer) => {
      if (!layer || !layer.objects || !Array.isArray(layer.objects)) return;
      const offX = Number(layer.offsetx ?? layer.x ?? 0);
      const offY = Number(layer.offsety ?? layer.y ?? 0);
      layer.objects.forEach((obj) => {
        const ox = (obj.x || 0) + offX;
        const oy = (obj.y || 0) + offY;
        const rotation = Number(obj.rotation || 0);

        const points = obj.polygon || obj.polyline;
        if (points && Array.isArray(points) && points.length >= 2) {
          const absPoints = points.map((pt) => {
            const rp = rotatePoint(pt, rotation);
            return { x: ox + rp.x, y: oy + rp.y };
          });
          if (obj.polygon && points.length >= 3) {
            rasterizePolygonCollision(absPoints);
          } else {
            // Polyline: approximate each segment with small axis-aligned boxes.
            const segmentThickness = Math.max(2, (tilemap.tileWidth || 6) / 2);
            for (let i = 1; i < absPoints.length; i++) {
              const a = absPoints[i - 1];
              const b = absPoints[i];
              const minX = Math.min(a.x, b.x) - segmentThickness / 2;
              const minY = Math.min(a.y, b.y) - segmentThickness / 2;
              const width = Math.abs(b.x - a.x) + segmentThickness;
              const height = Math.abs(b.y - a.y) + segmentThickness;
              addCollisionRectTiled(minX, minY, width, height);
            }
          }
          return;
        }
        const objW = Number(obj.width || 0);
        const objH = Number(obj.height || 0);
        if (objW <= 0 && objH <= 0) return; // skip point objects with no polygon
        if (Math.abs(rotation) > 0.001) {
          const rectPoints = [
            { x: 0, y: 0 },
            { x: objW, y: 0 },
            { x: objW, y: objH },
            { x: 0, y: objH },
          ].map((pt) => {
            const rp = rotatePoint(pt, rotation);
            return { x: ox + rp.x, y: oy + rp.y };
          });
          rasterizePolygonCollision(rectPoints);
          return;
        }
        addCollisionRectTiled(ox, oy, objW, objH);
      });
    };
    addObjectLayerToCollision(collisionLayer);
    addObjectLayerToCollision(foregroundLayer);

    // Prepare foreground TILE layer only if it exists (tileset needed for createLayer later)
    if (hasForegroundTileLayer) {
      const tileW = tilemap.tileWidth || 6;
      const tileH = tilemap.tileHeight || 6;
      const tilesets = tilemap.tilesets || [];
      const firstTilesetName = (tilesets[0] && tilesets[0].name) ? tilesets[0].name : 'dungeon';
      if (!tilemap.getTileset(firstTilesetName)) {
        tilemap.addTilesetImage(firstTilesetName, mapImageKey, tileW, tileH);
      }
    }
    // Depth for foreground: many Y bands (every ~2.5% of height) so the effect covers the whole map
    const bandCount = 40;
    this.foregroundYThresholds = Array.from({ length: bandCount - 1 }, (_, i) => (mapHeight * (i + 1)) / bandCount);
    // Depth: behind (40) < foreground (50); in front = 0 so player draws correctly when in front of foreground
    this.playerDepthBehind = 40;
    this.foregroundDepth = 50;
    this.playerDepthFront = 0;
    this._getDepthForY = (y) => {
      const band = this.foregroundYThresholds.filter((t) => y >= t).length;
      return band % 2 === 0 ? this.playerDepthFront : this.playerDepthBehind;
    };
    // Hysteresis: quantize Y so depth doesn't flicker when standing on a band boundary (use nearest 12px)
    this._foregroundDepthHysteresis = 12;

    // PlayerSpawn: use first object's center for player spawn position (supports Player_Spawn from dungeon1.json)
    let spawnLayer = tilemap.getObjectLayer('PlayerSpawn') || tilemap.getObjectLayer('player_spawn') || tilemap.getObjectLayer('Player_Spawn') || tilemap.getObjectLayer('Player_spawn');
    if (!spawnLayer && this.cache.tilemap.exists(mapDataKey)) {
      const tilemapData = this.cache.tilemap.get(mapDataKey);
      const raw = tilemapData && tilemapData.data ? tilemapData.data : null;
      const layers = (raw && raw.layers) ? raw.layers : [];
      const findLayer = (name) => layers.find((l) => l.name === name && (l.objects != null || l.type === 'objectlayer' || l.type === 'objectgroup'));
      spawnLayer = findLayer('PlayerSpawn') || findLayer('player_spawn') || findLayer('Player_Spawn') || findLayer('Player_spawn');
    }
    if (!spawnLayer && tilemap.objects) {
      spawnLayer = tilemap.objects.find((o) => o.name === 'PlayerSpawn' || o.name === 'player_spawn' || o.name === 'Player_Spawn');
    }

    let spawnX = mapWidth / 2;
    let spawnY = mapHeight / 2;

    // Tiled objectgroups store x/y at the top-left of rectangles.
    // Our NPC sprites use origin (0.5, 1) (bottom-center / "feet"), so we anchor rectangles at bottom-center.
    const getObjectAnchor = (obj) => {
      const w = Number(obj?.width || 0);
      const h = Number(obj?.height || 0);
      const isPoint = obj?.point === true || (w === 0 && h === 0);
      if (isPoint) return { x: obj.x, y: obj.y };
      return { x: obj.x + w / 2, y: obj.y + h };
    };

    const layerOffset = (layer) => ({
      x: Number(layer.offsetx ?? layer.x ?? 0),
      y: Number(layer.offsety ?? layer.y ?? 0),
    });
    if (spawnLayer && spawnLayer.objects && spawnLayer.objects.length > 0) {
      const obj = spawnLayer.objects[0];
      const off = layerOffset(spawnLayer);
      const pt = scaleTiledPoint(getObjectAnchor(obj), off.x, off.y);
      spawnX = Math.round(pt.x);
      spawnY = Math.round(pt.y);
    }

    // NpcSpawn: get object layer from Tiled and use each object's center for NPC spawn positions
    let npcSpawnLayer = tilemap.getObjectLayer('NpcSpawn') || tilemap.getObjectLayer('npc_spawn') || tilemap.getObjectLayer('Npc_Spawn') || tilemap.getObjectLayer('Npc_spawn');
    if (!npcSpawnLayer && this.cache.tilemap.exists(mapDataKey)) {
      const tilemapData = this.cache.tilemap.get(mapDataKey);
      const raw = tilemapData && tilemapData.data ? tilemapData.data : null;
      const layers = (raw && raw.layers) ? raw.layers : [];
      const findLayer = (name) => layers.find((l) => l.name === name && (l.objects != null || l.type === 'objectlayer' || l.type === 'objectgroup'));
      npcSpawnLayer = findLayer('NpcSpawn') || findLayer('npc_spawn') || findLayer('Npc_Spawn') || findLayer('Npc_spawn');
    }
    if (!npcSpawnLayer && tilemap.objects) {
      npcSpawnLayer = tilemap.objects.find((o) => o.name === 'NpcSpawn' || o.name === 'npc_spawn' || o.name === 'Npc_Spawn');
    }

    // Enough NPCs so each player has their own set: at least (questions × players), minimum 10
    const quizQuestionCount = this.registry.get('quizQuestionCount') || 0;
    const playerCount = this.registry.get('playerCount') || 1;
    const npcCount = Math.max(10, quizQuestionCount * playerCount);

    const npcConfigs = [
      { key: 'npc-bob', name: 'npc-bob' },
      { key: 'npc-alex', name: 'npc-alex' },
    ];
    const npcDirections = ['left', 'right', 'front', 'back'];

    // RNG seeded from server (npcSeed) so all users in the same game see the same NPC positions
    const createSeededRng = (seed) => {
      let state = (seed >>> 0) || 1;
      return () => {
        state = Math.imul(state ^ (state >>> 15), 1 | state);
        state = (state ^ (state >>> 7)) ^ (state >>> 13);
        return (state >>> 0) / 4294967296;
      };
    };
    const serverNpcSeed = this.registry.get('npcSeed');
    const npcSeed = (serverNpcSeed != null && Number.isInteger(serverNpcSeed)) ? (serverNpcSeed >>> 0) : ((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    const rng = createSeededRng(npcSeed);

    // Spawn points from Tiled NpcSpawn layer, or fallback to random within map bounds
    let spawnPoints = [];
    if (npcSpawnLayer && npcSpawnLayer.objects && Array.isArray(npcSpawnLayer.objects) && npcSpawnLayer.objects.length > 0) {
      const npcOff = layerOffset(npcSpawnLayer);
      // City/Farm/Island map positions are correct without y offset
      const NPC_SPAWN_Y_OFFSET = 0;
      spawnPoints = npcSpawnLayer.objects.map((obj) => {
        const pt = scaleTiledPoint(getObjectAnchor(obj), npcOff.x, npcOff.y);
        return { x: pt.x, y: pt.y + NPC_SPAWN_Y_OFFSET };
      });
      // Shuffle so each game assigns NPCs to spawn points in a different order (same for both users via seed)
      for (let i = spawnPoints.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [spawnPoints[i], spawnPoints[j]] = [spawnPoints[j], spawnPoints[i]];
      }
    }

    const NPC_SPAWN_MARGIN = 80;
    const minX = NPC_SPAWN_MARGIN;
    const maxX = Math.max(minX, mapWidth - NPC_SPAWN_MARGIN);
    const minY = NPC_SPAWN_MARGIN;
    const maxY = Math.max(minY, mapHeight - NPC_SPAWN_MARGIN);

    const randomOffset = (range) => rng() * range * 2 - range;
    const npcPositions = [];
    for (let i = 0; i < npcCount; i++) {
      const cfg = npcConfigs[i % npcConfigs.length];
      let x, y;
      if (spawnPoints.length > 0) {
        const pt = spawnPoints[i % spawnPoints.length];
        // First pass through spawn points: place NPCs exactly on marked positions.
        // Only apply spread when we start reusing spawn points (more NPCs than markers).
        const spread = i >= spawnPoints.length ? 20 : 0;
        x = pt.x + randomOffset(spread);
        y = pt.y + randomOffset(spread);
      } else {
        x = minX + rng() * (maxX - minX);
        y = minY + rng() * (maxY - minY);
      }
      const dirIndex = Math.floor(rng() * npcDirections.length);
      const direction = npcDirections[dirIndex];
      const idleKey = `${cfg.key}-idle-${direction}`;
      npcPositions.push({
        x,
        y,
        key: cfg.key,
        name: `${cfg.name}-${i}`,
        idleKey,
        direction,
      });
    }

    // ----- NPCs: sheet is column-based. Col 0-5 right, 6-11 back, 12-17 left, 18-23 front.
    const createNpcAnimations = (keyPrefix, spriteKey) => {
      if (this.anims.exists(`${keyPrefix}-idle-right`)) return;
      this.anims.create({ key: `${keyPrefix}-idle-right`, frames: this.anims.generateFrameNumbers(spriteKey, { start: 0, end: 5 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: `${keyPrefix}-idle-back`, frames: this.anims.generateFrameNumbers(spriteKey, { start: 6, end: 11 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: `${keyPrefix}-idle-left`, frames: this.anims.generateFrameNumbers(spriteKey, { start: 12, end: 17 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: `${keyPrefix}-idle-front`, frames: this.anims.generateFrameNumbers(spriteKey, { start: 18, end: 23 }), frameRate: 6, repeat: -1 });
    };
    createNpcAnimations('npc-bob', 'npc-bob');
    createNpcAnimations('npc-alex', 'npc-alex');
    this.npcSprites = [];
    npcPositions.forEach(({ x, y, key, name, idleKey }, i) => {
      const npc = this.add.sprite(x, y, key).setName(name).setDepth(5);
      npc.setOrigin(0.5, 1);
      npc.setCrop(0, 0, NPC_FRAME_WIDTH, NPC_FRAME_HEIGHT);
      npc.setDisplaySize(PLAYER_DISPLAY_WIDTH, PLAYER_DISPLAY_HEIGHT);
      npc.play(idleKey);
      this.physics.add.existing(npc);
      npc.body.setImmovable(true);
      npc.body.moves = false;
      npc.body.allowRotation = false;
      npc.body.setSize(18, 26);
      npc.body.setOffset(-3, 8);
      npc.setData('idleKey', idleKey);
      npc.setData('npcIndex', i);
      this.npcSprites.push(npc);
    });

    if (DEBUG_NPC_COLLISION) {
      this.npcDebugGraphics = this.add.graphics().setDepth(10);
    }

    // Player animations (used by student and by teacher view for student sprites)
    if (!this.anims.exists('idle-left')) {
      this.anims.create({ key: 'idle-left', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'idle-back', frames: this.anims.generateFrameNumbers('player', { start: 3, end: 5 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'idle-right', frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'idle-front', frames: this.anims.generateFrameNumbers('player', { start: 9, end: 11 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'run-left', frames: this.anims.generateFrameNumbers('player-run', { start: 0, end: 2 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'run-back', frames: this.anims.generateFrameNumbers('player-run', { start: 3, end: 5 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'run-right', frames: this.anims.generateFrameNumbers('player-run', { start: 6, end: 8 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'run-front', frames: this.anims.generateFrameNumbers('player-run', { start: 9, end: 11 }), frameRate: 10, repeat: -1 });
    }
    if (!this.anims.exists('amelia-idle-left')) {
      this.anims.create({ key: 'amelia-idle-left', frames: this.anims.generateFrameNumbers('player-amelia', { start: 0, end: 2 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'amelia-idle-back', frames: this.anims.generateFrameNumbers('player-amelia', { start: 3, end: 5 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'amelia-idle-right', frames: this.anims.generateFrameNumbers('player-amelia', { start: 6, end: 8 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'amelia-idle-front', frames: this.anims.generateFrameNumbers('player-amelia', { start: 9, end: 11 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'amelia-run-left', frames: this.anims.generateFrameNumbers('player-amelia-run', { start: 0, end: 2 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'amelia-run-back', frames: this.anims.generateFrameNumbers('player-amelia-run', { start: 3, end: 5 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'amelia-run-right', frames: this.anims.generateFrameNumbers('player-amelia-run', { start: 6, end: 8 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'amelia-run-front', frames: this.anims.generateFrameNumbers('player-amelia-run', { start: 9, end: 11 }), frameRate: 10, repeat: -1 });
    }

    const cam = this.cameras.main;
    cam.setBounds(0, 0, mapWidth, mapHeight);

    const isStudent = this.registry.get('isStudent') === true;
    this.remotePlayers = new Map();
    this.lastEmitTime = 0;
    this._gamePlayerStateHandler = null;

    const dedupePlayersById = (list) => {
      if (!Array.isArray(list)) return [];
      const seen = new Set();
      return list.filter((p) => {
        const pid = p && String(p._id ?? p.id ?? '');
        if (!pid || seen.has(pid)) return false;
        seen.add(pid);
        return true;
      });
    };

    // Unlock Web Audio on first user interaction (runs for both teacher and student so BGM can start)
    const tryUnlockAudio = () => {
      try {
        const sm = this.sound;
        if (sm && sm.context && sm.context.state === 'suspended') {
          sm.context.resume();
        }
        if (this._bgmKey && this.cache.audio.exists(this._bgmKey)) {
          try {
            if (!this._bgmTrack) {
              const vol = this.getMusicVolume();
              this._bgmTrack = this.sound.add(this._bgmKey, { loop: true, volume: vol });
            }
            if (!this._bgmTrack.isPlaying) {
              this._bgmTrack.play();
            }
          } catch (e2) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }
    };
    this.input.once('pointerdown', tryUnlockAudio);
    if (this.input.keyboard) this.input.keyboard.once('keydown', tryUnlockAudio);
    if (typeof document !== 'undefined') {
      const useCapture = true;
      const docUnlock = () => {
        tryUnlockAudio();
        document.removeEventListener('click', docUnlock, useCapture);
        document.removeEventListener('keydown', docUnlock, useCapture);
      };
      document.addEventListener('click', docUnlock, useCapture);
      document.addEventListener('keydown', docUnlock, useCapture);
    }

    const socket = this.registry.get('socket');
    const userId = this.registry.get('userId');
    const sessionId = this.registry.get('sessionId');
    const players = this.registry.get('players') || [];
    const myId = String(userId ?? '');
    const playerGender = this.registry.get('playerGender');
    const isFemalePlayer = String(playerGender || '').toLowerCase() === 'female';
    const playerSpriteKey = isFemalePlayer ? 'player-amelia' : 'player';
    const idlePrefix = isFemalePlayer ? 'amelia-idle-' : 'idle-';
    const runPrefix = isFemalePlayer ? 'amelia-run-' : 'run-';

    if (isStudent) {
      // Student: own character + remotes for others
      let player = this.children.getByName('player');
      if (!player) {
        player = this.add.sprite(spawnX, spawnY, playerSpriteKey).setName('player').setDepth(5);
        player.setOrigin(0.5, 1);
        player.setCrop(0, 0, PLAYER_CROP_WIDTH, PLAYER_CROP_HEIGHT);
        player.setDisplaySize(CHARACTER_DISPLAY_SIZE, CHARACTER_DISPLAY_SIZE);
      }
      this.physics.add.existing(player);
      player.body.setCollideWorldBounds(true);
      player.body.setSize(8, 24);
      player.body.setOffset(3.5, 10);
      if (this.collisionBodies && this.collisionBodies.getLength() > 0) {
        this.physics.add.collider(player, this.collisionBodies);
      }
      this.npcSprites.forEach((npc) => {
        this.physics.add.overlap(player, npc, this._onNpcOverlap, null, this);
      });
      this.registry.set('answeredNpcIndices', new Set());
      this.registry.set('playerSpeedBoostUntil', 0);
      this.registry.set('hintUntil', 0);
      this.registry.set('playerSlowDebuffUntil', 0);
      this.registry.set('playerCrippledUntil', 0);
      this.registry.set('playerReversedControlsUntil', 0);
      this.hintIndicator = this.add.graphics().setDepth(6);
      if (DEBUG_COLLISION) {
        this.playerDebugGraphics = this.add.graphics().setDepth(10);
      }
      if (DEBUG_PLAYER_SIZE) {
        this.playerSizeDebugText = this.add
          .text(0, 0, '', { fontSize: '14px', color: '#00ff00', backgroundColor: '#000000aa' })
          .setOrigin(0.5, 1)
          .setPadding(4, 2)
          .setDepth(10);
      }
      this.player = player;
      this.lastDirection = 'front';
      this.idlePrefix = idlePrefix;
      this.runPrefix = runPrefix;
      this.player.play(idlePrefix + 'front');

      const playerName = this.registry.get('playerName') || 'Player';

      // Name label above local player (fixed UI nameplate — same on every map)
      this.playerNameText = this.add
        .text(0, 0, playerName, {
          fontFamily: PLAYER_NAME_FONT_FAMILY,
          fontSize: PLAYER_NAME_FONT_SIZE,
          color: PLAYER_NAME_COLOR,
          fontStyle: 'bold',
          backgroundColor: PLAYER_NAME_BG,
          stroke: PLAYER_NAME_STROKE,
          strokeThickness: PLAYER_NAME_STROKE_THICKNESS,
        })
        .setOrigin(0.5, 1)
        .setResolution(PLAYER_NAME_RESOLUTION)
        .setPadding(PLAYER_NAME_PADDING_X, PLAYER_NAME_PADDING_Y)
        .setShadow(PLAYER_NAME_SHADOW_OFFSET_X, PLAYER_NAME_SHADOW_OFFSET_Y, PLAYER_NAME_SHADOW_COLOR, PLAYER_NAME_SHADOW_BLUR)
        .setDepth(6);

      if (socket && sessionId) {
        // Ensure we're in the game-session room so we send/receive movement (handles race if React join ran before socket ready)
        socket.emit('join-game-session', { sessionId });
        const uniquePlayers = dedupePlayersById(players);
        uniquePlayers.forEach((p) => {
          const pid = String(p._id ?? p.id ?? '');
          if (!pid || pid === myId) return;
          const isFemale = String(p.gender || '').toLowerCase() === 'female';
          const remoteSpriteKey = isFemale ? 'player-amelia' : 'player';
          const remoteIdlePrefix = isFemale ? 'amelia-idle-' : 'idle-';
          const remote = this.add.sprite(spawnX, spawnY, remoteSpriteKey).setName(`remote-${pid}`).setDepth(5);
          remote.setOrigin(0.5, 1);
          remote.setCrop(0, 0, 16, 32);
          remote.setDisplaySize(CHARACTER_DISPLAY_SIZE, CHARACTER_DISPLAY_SIZE);
          remote.play(remoteIdlePrefix + 'front');
          const remoteName = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.playerName || p.name || 'Player';
          const nameText = this.add
            .text(spawnX, spawnY, remoteName, {
              fontFamily: PLAYER_NAME_FONT_FAMILY,
              fontSize: PLAYER_NAME_FONT_SIZE,
              color: PLAYER_NAME_COLOR,
              fontStyle: 'bold',
              backgroundColor: PLAYER_NAME_BG,
              stroke: PLAYER_NAME_STROKE,
              strokeThickness: PLAYER_NAME_STROKE_THICKNESS,
            })
            .setOrigin(0.5, 1)
            .setResolution(PLAYER_NAME_RESOLUTION)
            .setPadding(PLAYER_NAME_PADDING_X, PLAYER_NAME_PADDING_Y)
            .setShadow(PLAYER_NAME_SHADOW_OFFSET_X, PLAYER_NAME_SHADOW_OFFSET_Y, PLAYER_NAME_SHADOW_COLOR, PLAYER_NAME_SHADOW_BLUR)
            .setDepth(6);
          this.remotePlayers.set(pid, { sprite: remote, lastDirection: 'front', nameText, isFemale });
        });
        this._gamePlayerStateHandler = (data) => {
          if (!data || String(data.sessionId) !== String(sessionId)) return;
          const pid = String(data.playerId ?? data.socketId ?? '');
          if (!pid || pid === myId) return;
          if (!this.sys?.isActive?.()) return;
          let entry = this.remotePlayers.get(pid);
          if (!entry) {
            const isFemale = String(data.gender || '').toLowerCase() === 'female';
            const remoteSpriteKey = isFemale ? 'player-amelia' : 'player';
            const remoteIdlePrefix = isFemale ? 'amelia-idle-' : 'idle-';
            const remote = this.add.sprite(spawnX, spawnY, remoteSpriteKey).setName(`remote-${pid}`).setDepth(5);
            remote.setOrigin(0.5, 1);
            remote.setCrop(0, 0, 16, 32);
            remote.setDisplaySize(CHARACTER_DISPLAY_SIZE, CHARACTER_DISPLAY_SIZE);
            remote.play(data.anim || remoteIdlePrefix + 'front');
            const remoteName = data.playerName ?? 'Player';
            const nameText = this.add
              .text(spawnX, spawnY, remoteName, {
                fontFamily: PLAYER_NAME_FONT_FAMILY,
                fontSize: PLAYER_NAME_FONT_SIZE,
                color: PLAYER_NAME_COLOR,
                fontStyle: 'bold',
                backgroundColor: PLAYER_NAME_BG,
                stroke: PLAYER_NAME_STROKE,
                strokeThickness: PLAYER_NAME_STROKE_THICKNESS,
              })
              .setOrigin(0.5, 1)
              .setResolution(PLAYER_NAME_RESOLUTION)
              .setPadding(PLAYER_NAME_PADDING_X, PLAYER_NAME_PADDING_Y)
              .setShadow(PLAYER_NAME_SHADOW_OFFSET_X, PLAYER_NAME_SHADOW_OFFSET_Y, PLAYER_NAME_SHADOW_COLOR, PLAYER_NAME_SHADOW_BLUR)
              .setDepth(6);
            entry = { sprite: remote, lastDirection: 'front', nameText, isFemale };
            this.remotePlayers.set(pid, entry);
          }
          if (!entry?.sprite) return;
          try {
            const x = data.x ?? entry.sprite.x;
            const y = data.y ?? entry.sprite.y;
            entry.sprite.setPosition(x, y);
            if (entry.nameText) {
              entry.nameText.setPosition(x + PLAYER_NAME_OFFSET_X, y - CHARACTER_DISPLAY_SIZE / 2 - PLAYER_NAME_OFFSET_Y);
              if (data.playerName) entry.nameText.setText(data.playerName);
            }
            const dir = data.direction || 'front';
            const remoteIdlePrefix = entry.isFemale ? 'amelia-idle-' : 'idle-';
            const anim = data.anim || (dir === 'front' ? remoteIdlePrefix + 'front' : dir === 'back' ? remoteIdlePrefix + 'back' : dir === 'left' ? remoteIdlePrefix + 'right' : remoteIdlePrefix + 'left');
            if (entry.sprite.anims?.currentAnim?.key !== anim) {
              entry.sprite.play(anim);
            }
            entry.lastDirection = dir;
          } catch (_) {}
          const onPlayerHealth = this.registry.get('onPlayerHealth');
          if (typeof onPlayerHealth === 'function' && data.health != null) onPlayerHealth(pid, data.health);
        };
        socket.on('game-player-state', this._gamePlayerStateHandler);
        socket.emit('game-player-state', {
          sessionId,
          playerId: userId,
          playerName,
          x: this.player.x,
          y: this.player.y,
          direction: this.lastDirection,
          anim: idlePrefix + 'front',
          health: this.getHealth?.() ?? HEALTH_MAX,
          gender: playerGender ?? undefined,
        });
        const scene = this;
        this.registry.set('emitPlayerStateNow', () => {
          if (!scene.player) return;
          const s = scene.registry.get('socket');
          const sid = scene.registry.get('sessionId');
          const uid = scene.registry.get('userId');
          const pname = scene.registry.get('playerName') || 'Player';
          const pgender = scene.registry.get('playerGender');
          if (!s || !sid || !uid) return;
          s.emit('game-player-state', {
            sessionId: sid,
            playerId: uid,
            playerName: pname,
            x: scene.player.x,
            y: scene.player.y,
            direction: scene.lastDirection,
            anim: scene.player.anims?.currentAnim?.key || (scene.idlePrefix || 'idle-') + 'front',
            health: scene.getHealth?.() ?? HEALTH_MAX,
            gender: pgender ?? undefined,
          });
        });
      }

      this.cursors = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      });
      this.cursorArrows = this.input.keyboard.createCursorKeys();
      cam.startFollow(this.player, true, 0.1, 0.1);
    } else {
      // Teacher: spectate only — no character, camera follows first student
      this.player = null;
      this.cursors = null;
      this.cursorArrows = null;

      if (socket && sessionId && players.length > 0) {
        const uniquePlayersTeacher = dedupePlayersById(players);
        uniquePlayersTeacher.forEach((p) => {
          const pid = String(p._id ?? p.id ?? '');
          if (!pid) return;
          const isFemale = String(p.gender || '').toLowerCase() === 'female';
          const remoteSpriteKey = isFemale ? 'player-amelia' : 'player';
          const remoteIdlePrefix = isFemale ? 'amelia-idle-' : 'idle-';
          const remote = this.add.sprite(spawnX, spawnY, remoteSpriteKey).setName(`remote-${pid}`).setDepth(5);
          remote.setOrigin(0.5, 1);
          remote.setCrop(0, 0, 16, 32);
          remote.setDisplaySize(CHARACTER_DISPLAY_SIZE, CHARACTER_DISPLAY_SIZE);
          remote.play(remoteIdlePrefix + 'front');
          const remoteName = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.playerName || p.name || 'Player';
          const nameText = this.add
            .text(spawnX, spawnY, remoteName, {
              fontFamily: PLAYER_NAME_FONT_FAMILY,
              fontSize: PLAYER_NAME_FONT_SIZE,
              color: PLAYER_NAME_COLOR,
              fontStyle: 'bold',
              backgroundColor: PLAYER_NAME_BG,
              stroke: PLAYER_NAME_STROKE,
              strokeThickness: PLAYER_NAME_STROKE_THICKNESS,
            })
            .setOrigin(0.5, 1)
            .setResolution(PLAYER_NAME_RESOLUTION)
            .setPadding(PLAYER_NAME_PADDING_X, PLAYER_NAME_PADDING_Y)
            .setShadow(PLAYER_NAME_SHADOW_OFFSET_X, PLAYER_NAME_SHADOW_OFFSET_Y, PLAYER_NAME_SHADOW_COLOR, PLAYER_NAME_SHADOW_BLUR)
            .setDepth(6);
          this.remotePlayers.set(pid, { sprite: remote, lastDirection: 'front', nameText, isFemale });
        });
        this._gamePlayerStateHandler = (data) => {
          if (!data || String(data.sessionId) !== String(sessionId)) return;
          const pid = String(data.playerId ?? data.socketId ?? '');
          if (!pid) return;
          if (!this.sys?.isActive?.()) return;
          let entry = this.remotePlayers.get(pid);
          if (!entry) {
            const isFemale = String(data.gender || '').toLowerCase() === 'female';
            const remoteSpriteKey = isFemale ? 'player-amelia' : 'player';
            const remoteIdlePrefix = isFemale ? 'amelia-idle-' : 'idle-';
            const remote = this.add.sprite(spawnX, spawnY, remoteSpriteKey).setName(`remote-${pid}`).setDepth(5);
            remote.setOrigin(0.5, 1);
            remote.setCrop(0, 0, 16, 32);
            remote.setDisplaySize(CHARACTER_DISPLAY_SIZE, CHARACTER_DISPLAY_SIZE);
            remote.play(data.anim || remoteIdlePrefix + 'front');
            const remoteName = data.playerName ?? 'Player';
            const nameText = this.add
              .text(spawnX, spawnY, remoteName, {
                fontFamily: PLAYER_NAME_FONT_FAMILY,
                fontSize: PLAYER_NAME_FONT_SIZE,
                color: PLAYER_NAME_COLOR,
                fontStyle: 'bold',
                backgroundColor: PLAYER_NAME_BG,
                stroke: PLAYER_NAME_STROKE,
                strokeThickness: PLAYER_NAME_STROKE_THICKNESS,
              })
              .setOrigin(0.5, 1)
              .setResolution(PLAYER_NAME_RESOLUTION)
              .setPadding(PLAYER_NAME_PADDING_X, PLAYER_NAME_PADDING_Y)
              .setShadow(PLAYER_NAME_SHADOW_OFFSET_X, PLAYER_NAME_SHADOW_OFFSET_Y, PLAYER_NAME_SHADOW_COLOR, PLAYER_NAME_SHADOW_BLUR)
              .setDepth(6);
            entry = { sprite: remote, lastDirection: 'front', nameText, isFemale };
            this.remotePlayers.set(pid, entry);
            if (this.teacherStretchContainer) {
              this.teacherStretchContainer.add(remote);
              this.teacherStretchContainer.add(entry.nameText);
            }
          }
          if (!entry?.sprite) return;
          try {
            const x = data.x ?? entry.sprite.x;
            const y = data.y ?? entry.sprite.y;
            entry.sprite.setPosition(x, y);
            if (entry.nameText) {
              entry.nameText.setPosition(x + PLAYER_NAME_OFFSET_X, y - CHARACTER_DISPLAY_SIZE / 2 - PLAYER_NAME_OFFSET_Y);
              if (data.playerName) entry.nameText.setText(data.playerName);
            }
            const dir = data.direction || 'front';
            const remoteIdlePrefix = entry.isFemale ? 'amelia-idle-' : 'idle-';
            const anim = data.anim || (dir === 'front' ? remoteIdlePrefix + 'front' : dir === 'back' ? remoteIdlePrefix + 'back' : dir === 'left' ? remoteIdlePrefix + 'right' : remoteIdlePrefix + 'left');
            if (entry.sprite.anims?.currentAnim?.key !== anim) {
              entry.sprite.play(anim);
            }
            entry.lastDirection = dir;
          } catch (_) {}
          const onPlayerHealth = this.registry.get('onPlayerHealth');
          if (typeof onPlayerHealth === 'function' && data.health != null) onPlayerHealth(pid, data.health);
        };
        socket.on('game-player-state', this._gamePlayerStateHandler);
      }

      // Teacher: stretch map to fill viewport and show whole map (scaleX/scaleY so full map visible, no letterboxing)
      this._teacherMapWidth = mapWidth;
      this._teacherMapHeight = mapHeight;
      const stretchContainer = this.add.container(0, 0).setDepth(0);
      stretchContainer.add(this.cityImage);
      this.npcSprites.forEach((n) => stretchContainer.add(n));
      // Teacher: pointers above each NPC (downward triangle)
      this.npcPointers = [];
      const pointerDepth = 15;
      this.npcSprites.forEach((npc) => {
        const g = this.add.graphics();
        const tipY = 10;
        const halfW = 6;
        g.fillStyle(0xffdd00, 0.95);
        g.fillTriangle(-halfW, -tipY, halfW, -tipY, 0, tipY);
        g.lineStyle(2, 0xffffff, 0.9);
        g.strokeTriangle(-halfW, -tipY, halfW, -tipY, 0, tipY);
        g.setPosition(npc.x, npc.y - npc.displayHeight - 10);
        g.setDepth(pointerDepth);
        stretchContainer.add(g);
        this.npcPointers.push(g);
      });
      this.remotePlayers.forEach((entry) => {
        stretchContainer.add(entry.sprite);
        if (entry.nameText) stretchContainer.add(entry.nameText);
      });
      this.teacherStretchContainer = stretchContainer;
      this._teacherNeedsForegroundInContainer = true;

      const fitTeacherStretch = (width, height) => {
        const w = width ?? this.scale.width;
        const h = height ?? this.scale.height;
        const mw = this._teacherMapWidth || mapWidth;
        const mh = this._teacherMapHeight || mapHeight;
        const scaleX = w / mw;
        const scaleY = h / mh;
        if (this.teacherStretchContainer) {
          this.teacherStretchContainer.setScale(scaleX, scaleY);
        }
        cam.setSize(w, h);
        cam.setZoom(1);
        cam.setScroll(0, 0);
      };
      this._fitTeacherStretch = fitTeacherStretch;
      fitTeacherStretch(this.scale.width, this.scale.height);
      this.scale.on('resize', (gameSize) => {
        fitTeacherStretch(gameSize.width, gameSize.height);
      });
    }

    const fitStudentCamera = (width, height) => {
      const w = width ?? this.scale.width;
      const h = height ?? this.scale.height;
      cam.setSize(w, h);
      const zoomX = w / mapWidth;
      const zoomY = h / mapHeight;
      cam.setZoom(Math.max(zoomX, zoomY) * STUDENT_CAMERA_ZOOM);
    };
    if (isStudent) {
      fitStudentCamera(this.scale.displaySize?.width ?? this.scale.width, this.scale.displaySize?.height ?? this.scale.height);
      this.scale.on('resize', (gameSize) => {
        const w = gameSize.width;
        const h = gameSize.height;
        cam.setSize(w, h);
        const zoomX = w / mapWidth;
        const zoomY = h / mapHeight;
        cam.setZoom(Math.max(zoomX, zoomY) * STUDENT_CAMERA_ZOOM);
      });
    }

    // --- Foreground layer: one place, no duplicate creation ---
    // Renders above player (depth 8); player depth is 5 or 9 so they can go behind or in front by Y bands.
    if (this._hasForegroundTileLayer) {
      const foregroundLayerObj = tilemap.createLayer('Foreground', tilemap.tilesets, 0, 0);
      if (foregroundLayerObj) {
        foregroundLayerObj.setScale(tiledScaleX, tiledScaleY);
        foregroundLayerObj.setDepth(this.foregroundDepth);
        console.log('[Foreground] Created Tiled "Foreground" tile layer; depth =', this.foregroundDepth);
      } else {
        console.warn('[Foreground] createLayer("Foreground") returned null; falling back to image.');
        this._hasForegroundTileLayer = false;
      }
    }

    if (!this._hasForegroundTileLayer) {
      if (mapForegroundKey && this.textures.exists(mapForegroundKey)) {
        this.foregroundImage = this.add.image(0, 0, mapForegroundKey).setOrigin(0).setDepth(this.foregroundDepth);
        this.foregroundImage.setDisplaySize(mapWidth, mapHeight);
        console.log('[Foreground] Using fallback image "' + mapForegroundKey + '"; depth =', this.foregroundDepth);
      } else if (mapImageKey && this.textures.exists(mapImageKey)) {
        this.foregroundImage = this.add.image(0, 0, mapImageKey).setOrigin(0).setDepth(this.foregroundDepth);
        this.foregroundImage.setDisplaySize(mapWidth, mapHeight);
        console.log('[Foreground] Using map image as fallback; depth =', this.foregroundDepth);
      } else {
        console.warn('[Foreground] No tile layer and no fallback image available; foreground disabled.');
      }
    }

    if (this.foregroundImage && this.teacherStretchContainer && this._teacherNeedsForegroundInContainer) {
      this.teacherStretchContainer.add(this.foregroundImage);
    }

    if (this._hasForegroundTileLayer || this.foregroundImage) {
      console.log('[Foreground] Active. Depth:', this.foregroundDepth, '(player in front =', this.playerDepthFront, ', behind =', this.playerDepthBehind, ')');
    }
    // Debug: show outline and band lines for the foreground layer (high visibility)
    if (DEBUG_FOREGROUND && this.foregroundImage != null && this.foregroundYThresholds && this.foregroundYThresholds.length > 0) {
      const g = this.add.graphics().setDepth(9999);
      g.fillStyle(0x00ffff, 0.12);
      g.fillRect(0, 0, mapWidth, mapHeight);
      g.lineStyle(4, 0x00ffff, 1);
      g.strokeRect(0, 0, mapWidth, mapHeight);
      g.lineStyle(2, 0xff00ff, 0.9);
      this.foregroundYThresholds.forEach((y) => {
        g.lineBetween(0, y, mapWidth, y);
      });
      if (this.teacherStretchContainer && this._teacherNeedsForegroundInContainer) {
        this.teacherStretchContainer.add(g);
      }
      this._foregroundDebugGraphics = g;
    }
  }

  /**
   * Shared logic to show the question modal for an NPC. Returns true if the modal was triggered.
   * Used by both overlap callback and proximity fallback (so we don't miss triggers due to tunneling).
   */
  _tryShowNpcQuestion(npcIndex) {
    if (npcIndex === undefined) return false;
    const answered = this.registry.get('answeredNpcIndices');
    if (answered && answered.has(npcIndex)) return false;
    const questions = this.registry.get('quizQuestions') || [];
    if (!questions.length) return false;
    const playerCount = this.registry.get('playerCount') || 1;
    const myPlayerIndex = this.registry.get('myPlayerIndex') ?? 0;
    if ((npcIndex % playerCount) !== myPlayerIndex) return false;
    if (npcIndex >= questions.length * playerCount) return false;
    const questionIndex = Math.floor(npcIndex / playerCount) % questions.length;
    const question = questions[questionIndex];
    if (!question) return false;
    const onNpcCollision = this.registry.get('onNpcCollision');
    if (typeof onNpcCollision !== 'function') return false;
    this._npcQuestionCooldown = this._npcQuestionCooldown || {};
    const now = Date.now();
    if (this._npcQuestionCooldown[npcIndex] && now - this._npcQuestionCooldown[npcIndex] < 2000) return false;
    this._npcQuestionCooldown[npcIndex] = now;
    this.registry.set('playerFrozen', true);
    onNpcCollision(question, npcIndex);
    return true;
  }

  _onNpcOverlap(player, npc) {
    const npcIndex = npc.getData('npcIndex');
    this._tryShowNpcQuestion(npcIndex);
  }

  update(_, delta) {
    // Start BGM as soon as audio context is running (fixes students not hearing BGM when unlock callback doesn't run)
    if (!this._bgmStartedWhenUnlocked && this.sound && this.sound.context && this.sound.context.state === 'running' && this._bgmKey && this.cache.audio.exists(this._bgmKey)) {
      try {
        if (!this._bgmTrack) this._bgmTrack = this.sound.add(this._bgmKey, { loop: true, volume: this.getMusicVolume() });
        if (this._bgmTrack && !this._bgmTrack.isPlaying) this._bgmTrack.play();
        this._bgmStartedWhenUnlocked = true;
      } catch (e) { /* ignore */ }
    }
    if (this._bgmTrack) this._bgmTrack.setVolume(this.getMusicVolume());

    if (!this.player) return; // Teacher: spectate only, no character

    const now = Date.now();
    const frozen = this.registry.get('playerFrozen');
    if (this.input.keyboard) {
      this.input.keyboard.enabled = !frozen;
    }
    const unfreezeCooldownUntil = this.registry.get('unfreezeCooldownUntil') || 0;
    const inCooldown = Date.now() < unfreezeCooldownUntil;
    const crippledUntil = this.registry.get('playerCrippledUntil') || 0;
    const isCrippled = crippledUntil > now;
    if (frozen || inCooldown) {
      this.player.body.setVelocity(0, 0);
      const idleDir = this.lastDirection === 'left' ? 'right' : this.lastDirection === 'right' ? 'left' : this.lastDirection;
      const idleKey = (this.idlePrefix || 'idle-') + (idleDir || 'front');
      if (this.player.anims?.currentAnim?.key !== idleKey) {
        this.player.play(idleKey);
      }
      return;
    }
    if (isCrippled) {
      this.player.body.setVelocity(0, 0);
      const idleDir = this.lastDirection === 'left' ? 'right' : this.lastDirection === 'right' ? 'left' : this.lastDirection;
      const idleKey = (this.idlePrefix || 'idle-') + (idleDir || 'front');
      if (this.player.anims?.currentAnim?.key !== idleKey) {
        this.player.play(idleKey);
      }
    } else {
    const vm = this.registry.get('virtualMove') || NO_MOVE;
    const up = this.cursors.up.isDown || this.cursorArrows.up.isDown;
    const down = this.cursors.down.isDown || this.cursorArrows.down.isDown;
    const left = this.cursors.left.isDown || this.cursorArrows.left.isDown;
    const right = this.cursors.right.isDown || this.cursorArrows.right.isDown;

    let stuck = this.registry.get('stuckMoveKeys');
    const snapshotDone = this.registry.get('unfreezeStuckSnapshotDone');
    if (!snapshotDone && unfreezeCooldownUntil > 0) {
      stuck = { up, down, left, right };
      this.registry.set('stuckMoveKeys', stuck);
      this.registry.set('unfreezeStuckSnapshotDone', true);
    }
    if (stuck) {
      if (!up) stuck.up = false;
      if (!down) stuck.down = false;
      if (!left) stuck.left = false;
      if (!right) stuck.right = false;
      this.registry.set('stuckMoveKeys', stuck);
    }
    const eUp = up && !(stuck && stuck.up);
    const eDown = down && !(stuck && stuck.down);
    const eLeft = left && !(stuck && stuck.left);
    const eRight = right && !(stuck && stuck.right);

    const reversedUntil = this.registry.get('playerReversedControlsUntil') || 0;
    const reversed = reversedUntil > now;
    const moveUp = (reversed ? eDown : eUp) || !!vm.up;
    const moveDown = (reversed ? eUp : eDown) || !!vm.down;
    const moveLeft = (reversed ? eRight : eLeft) || !!vm.left;
    const moveRight = (reversed ? eLeft : eRight) || !!vm.right;

    const speedBoostUntil = this.registry.get('playerSpeedBoostUntil') || 0;
    const slowDebuffUntil = this.registry.get('playerSlowDebuffUntil') || 0;
    let speed = (speedBoostUntil > now) ? (PLAYER_SPEED * 1.5) : PLAYER_SPEED;
    if (slowDebuffUntil > now) speed *= DEBUFF_SLOW_MULTIPLIER;
    const moving = moveLeft || moveRight || moveUp || moveDown;
    if (moving) {
      if (moveLeft) {
        this.lastDirection = 'left';
        this.player.body.setVelocityX(-speed);
      } else if (moveRight) {
        this.lastDirection = 'right';
        this.player.body.setVelocityX(speed);
      } else {
        this.player.body.setVelocityX(0);
      }
      if (moveUp) {
        this.lastDirection = 'back';
        this.player.body.setVelocityY(-speed);
      } else if (moveDown) {
        this.lastDirection = 'front';
        this.player.body.setVelocityY(speed);
      } else {
        this.player.body.setVelocityY(0);
      }
      const runAnimDir = this.lastDirection === 'left' ? 'right' : this.lastDirection === 'right' ? 'left' : this.lastDirection;
      const runKey = (this.runPrefix || 'run-') + runAnimDir;
      if (this.player.anims.currentAnim?.key !== runKey) {
        this.player.play(runKey);
      }
    } else {
      this.player.body.setVelocityX(0);
      this.player.body.setVelocityY(0);
      const idleAnimDir = this.lastDirection === 'left' ? 'right' : this.lastDirection === 'right' ? 'left' : this.lastDirection;
      const idleKey = (this.idlePrefix || 'idle-') + idleAnimDir;
      if (this.player.anims.currentAnim?.key !== idleKey) {
        this.player.play(idleKey);
      }
    }
    }

    // Trigger question modal only when player body overlaps NPC body (collision-based, no proximity)
    const questions = this.registry.get('quizQuestions') || [];
    const playerCount = this.registry.get('playerCount') || 1;
    const myPlayerIndex = this.registry.get('myPlayerIndex') ?? 0;
    const maxNpcWithQuestion = (questions.length || 0) * playerCount;
    if (this.npcSprites && this.player && this.player.body && questions.length > 0) {
      for (let i = 0; i < this.npcSprites.length; i++) {
        if (i >= maxNpcWithQuestion || (i % playerCount) !== myPlayerIndex) continue;
        const npc = this.npcSprites[i];
        if (!npc || !npc.body) continue;
        if (this.physics.overlap(this.player, npc)) {
          this._tryShowNpcQuestion(i);
        }
      }
    }

    // Hint indicator: arrow from player to assigned NPC (replaces pulsing ring)
    if (this.hintIndicator) {
      this.hintIndicator.clear();
    }
    const hintNpcIndex = this.registry.get('hintNpcIndex');
    const hintUntil = this.registry.get('hintUntil') || 0;
    if (this.hintIndicator && hintNpcIndex != null && hintUntil > now && this.npcSprites && this.npcSprites[hintNpcIndex] && this.player) {
      const npc = this.npcSprites[hintNpcIndex];
      const g = this.hintIndicator;
      const fromX = this.player.x;
      const fromY = this.player.y - this.player.displayHeight / 2;
      const toX = npc.x;
      const toY = npc.y - npc.displayHeight / 2;
      const dx = toX - fromX;
      const dy = toY - fromY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
      const arrowLen = 14;
      const arrowW = 8;
      // Line from player to NPC (stop short so arrowhead sits at NPC)
      const lineEndX = toX - ux * arrowLen;
      const lineEndY = toY - uy * arrowLen;
      g.lineStyle(4, 0xffdd00, pulse);
      g.lineBetween(fromX, fromY, lineEndX, lineEndY);
      g.lineStyle(2, 0xffffff, pulse * 0.9);
      g.lineBetween(fromX, fromY, lineEndX, lineEndY);
      // Arrowhead at NPC (filled triangle)
      const ax = toX;
      const ay = toY;
      const b1x = toX - ux * arrowLen - uy * arrowW;
      const b1y = toY - uy * arrowLen + ux * arrowW;
      const b2x = toX - ux * arrowLen + uy * arrowW;
      const b2y = toY - uy * arrowLen - ux * arrowW;
      g.fillStyle(0xffdd00, pulse);
      g.fillTriangle(ax, ay, b1x, b1y, b2x, b2y);
      g.lineStyle(2, 0xffffff, pulse * 0.9);
      g.strokeTriangle(ax, ay, b1x, b1y, b2x, b2y);
    }

    // Debug: draw player collision body in red (size 20×24, offset 6,8)
    if (DEBUG_COLLISION && this.playerDebugGraphics) {
      const b = this.player.body;
      this.playerDebugGraphics.clear();
      this.playerDebugGraphics.lineStyle(2, 0xff0000);
      this.playerDebugGraphics.strokeRect(b.x, b.y, b.width, b.height);
    }

    // Debug: draw NPC collision bodies in green (box collider per NPC)
    if (DEBUG_NPC_COLLISION && this.npcDebugGraphics && this.npcSprites) {
      this.npcDebugGraphics.clear();
      this.npcDebugGraphics.lineStyle(2, 0x00ff00);
      this.npcSprites.forEach((npc) => {
        if (npc.body) {
          const b = npc.body;
          this.npcDebugGraphics.strokeRect(b.x, b.y, b.width, b.height);
        }
      });
    }

    // Debug: show player width/height on sprite
    if (DEBUG_PLAYER_SIZE && this.playerSizeDebugText) {
      const w = Math.round(this.player.displayWidth);
      const h = Math.round(this.player.displayHeight);
      this.playerSizeDebugText.setText(`${w} × ${h}`);
      this.playerSizeDebugText.setPosition(this.player.x, this.player.y - this.player.displayHeight / 2 - 4);
    }

    // Name label above local player
    if (this.playerNameText) {
      this.playerNameText.setPosition(this.player.x + PLAYER_NAME_OFFSET_X, this.player.y - this.player.displayHeight / 2 - PLAYER_NAME_OFFSET_Y);
    }

    // Foreground depth: when player/NPC Y is in a "behind" band, render behind foreground layer
    // Use quantized Y so depth is stable near band boundaries (avoids "sometimes in front" flicker)
    if (this._getDepthForY && this.player) {
      const hysteresis = this._foregroundDepthHysteresis ?? 12;
      const quantize = (y) => Math.round(Number(y) / hysteresis) * hysteresis;
      const depthFor = (y) => this._getDepthForY(quantize(y));
      const depth = depthFor(this.player.y);
      this.player.setDepth(depth);
      if (this.playerNameText) this.playerNameText.setDepth(depth);
      if (this.remotePlayers) {
        this.remotePlayers.forEach((entry) => {
          if (entry.sprite) {
            const d = depthFor(entry.sprite.y);
            entry.sprite.setDepth(d);
            if (entry.nameText) entry.nameText.setDepth(d);
          }
        });
      }
      if (this.npcSprites && this.npcSprites.length > 0) {
        this.npcSprites.forEach((npc) => {
          if (npc.y != null) npc.setDepth(depthFor(npc.y));
        });
      }
    }

    const lastResult = this.registry.get('lastAnswerResult');
    const resultUntil = this.registry.get('lastAnswerResultUntil') || 0;
    if (lastResult && now < resultUntil) {
      // Play answer sound once per result (volume from Settings)
      if (this._lastAnswerSoundResult !== lastResult && this.sound) {
        this._lastAnswerSoundResult = lastResult;
        try {
          const sm = this.sound;
          if (sm.context && sm.context.state === 'suspended') sm.context.resume();
          const vol = this.getSoundVolume();
          if (this.cache.audio.exists(lastResult === 'correct' ? 'sfx-correct' : 'sfx-incorrect')) {
            if (lastResult === 'correct') sm.play('sfx-correct', { volume: vol });
            else sm.play('sfx-incorrect', { volume: vol });
          }
        } catch (e) { /* ignore */ }
      }
    } else if (now >= resultUntil) {
      this._lastAnswerSoundResult = null;
    }

    // Multiplayer: broadcast position to other students (throttled)
    const socket = this.registry.get('socket');
    const sessionId = this.registry.get('sessionId');
    const userId = this.registry.get('userId');
    const playerName = this.registry.get('playerName') || 'Player';
    const playerGender = this.registry.get('playerGender');
    if (socket && sessionId && userId && this.lastEmitTime !== undefined) {
      const now = Date.now();
      if (now - this.lastEmitTime >= MULTIPLAYER_EMIT_INTERVAL_MS) {
        this.lastEmitTime = now;
        const anim = this.player.anims.currentAnim?.key || (this.idlePrefix || 'idle-') + 'front';
        socket.emit('game-player-state', {
          sessionId,
          playerId: userId,
          playerName,
          x: this.player.x,
          y: this.player.y,
          direction: this.lastDirection,
          anim,
          health: this.getHealth?.() ?? HEALTH_MAX,
          gender: playerGender ?? undefined,
        });
      }
    }
  }

  shutdown() {
    if (this._bgmTrack) {
      try { this._bgmTrack.stop(); } catch (e) { /* ignore */ }
      this._bgmTrack = null;
    }
    if (this._gamePlayerStateHandler) {
      const socket = this.registry.get('socket');
      if (socket) socket.off('game-player-state', this._gamePlayerStateHandler);
    }
  }
}

/* =========================
   STEERING WHEEL (mobile/tablet touch control)
========================= */
const NO_MOVE = { up: false, down: false, left: false, right: false };

function invertDirectionalInput(move) {
  const nextMove = move || NO_MOVE;
  return {
    up: !!nextMove.down,
    down: !!nextMove.up,
    left: !!nextMove.right,
    right: !!nextMove.left,
  };
}

function angleToDirection(angleDeg) {
  // 0° = right, 90° = down, 180° = left, 270° = up; 8-way for smooth diagonals
  const a = ((angleDeg % 360) + 360) % 360;
  const up = a > 202.5 && a < 337.5;
  const down = a > 22.5 && a < 157.5;
  const left = a > 112.5 && a < 247.5;
  const right = a < 67.5 || a >= 292.5;
  return { up, down, left, right };
}

function SteeringWheel({ onMove, disabled }) {
  const wheelRef = useRef(null);
  const isActiveRef = useRef(false);

  const getAngle = useCallback((clientX, clientY) => {
    const el = wheelRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - cy, clientX - cx);
    return (rad * 180 / Math.PI + 360) % 360;
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    if (wheelRef.current && typeof e.target.setPointerCapture === 'function') {
      e.target.setPointerCapture(e.pointerId);
    }
    isActiveRef.current = true;
    const angle = getAngle(e.clientX, e.clientY);
    if (angle != null) onMove(angleToDirection(angle));
  }, [disabled, getAngle, onMove]);

  const handlePointerMove = useCallback((e) => {
    if (!isActiveRef.current || disabled) return;
    const angle = getAngle(e.clientX, e.clientY);
    if (angle != null) onMove(angleToDirection(angle));
  }, [disabled, getAngle, onMove]);

  const handlePointerUp = useCallback(() => {
    if (!isActiveRef.current) return;
    isActiveRef.current = false;
    onMove(NO_MOVE);
  }, [onMove]);

  return (
    <div
      ref={wheelRef}
      role="slider"
      aria-label="Movement control"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'fixed',
        bottom: 'max(env(safe-area-inset-bottom), 16px)',
        left: 'max(env(safe-area-inset-left), 16px)',
        width: 'min(160px, 28vw)',
        height: 'min(160px, 28vw)',
        minWidth: 100,
        minHeight: 100,
        borderRadius: '50%',
        background: disabled ? 'rgba(40,40,40,0.6)' : 'rgba(0,0,0,0.45)',
        border: '4px solid rgba(255,255,255,0.5)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 0 0 2px rgba(255,255,255,0.15)',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em' }}>MOVE</span>
    </div>
  );
}

/* =========================
   REACT COMPONENT
========================= */
const Gameplay = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { socket, joinGameSession, leaveGameSession, joinClass, leaveClass } = useSocket();

  const gameRef = useRef(null);
  const phaserRef = useRef(null);
  const portalRootRef = useRef(null);
  const fillBlankInputRef = useRef(null);
  const consecutiveCorrectRef = useRef(0);
  const totalCorrectRef = useRef(0);
  const latestScoreRef = useRef(0);
  const pointsThisGameRef = useRef(0);
  const playerScoresAtStartRef = useRef({});
  const timeUpCalledRef = useRef(false);
  const prevStatusRef = useRef(null);
  const gameEndedByAllPlayersRef = useRef(false);
  const healthRef = useRef(HEALTH_MAX);
  const doublePointsRemainingRef = useRef(0);
  const recordFinishCalledRef = useRef(false);
  const gameOverSoundPlayedRef = useRef(false);
  const totalPausedMsRef = useRef(0);
  const pauseStartedAtRef = useRef(null);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalReady, setPortalReady] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [paused, setPaused] = useState(false);
  const [questionModal, setQuestionModal] = useState(null);
  const [gameOverModal, setGameOverModal] = useState(null);
  const [teacherGameOverModal, setTeacherGameOverModal] = useState(false);
  const [showGoToLobbyModal, setShowGoToLobbyModal] = useState(false);
  const teacherStoppedGameRef = useRef(false);
  const [, setPlayerHealthMap] = useState({});
  const [studentPoints, setStudentPoints] = useState(0);
  const [health, setHealth] = useState(HEALTH_MAX);
  useEffect(() => { healthRef.current = health; }, [health]);
  const playAnswerSoundImmediately = (result) => {
    try {
      const scene = phaserRef.current?.scene?.scenes?.[0];
      if (scene) scene._lastAnswerSoundResult = result;
      const sound = phaserRef.current?.sound;
      if (sound?.context?.state === 'suspended') sound.context.resume();
      const key = result === 'correct' ? 'sfx-correct' : 'sfx-incorrect';
      sound?.play(key, { volume: getSoundVolumeLS() });
    } catch (e) { /* ignore */ }
  };
  const playGameOverSoundOnce = (won) => {
    if (gameOverSoundPlayedRef.current) return;
    gameOverSoundPlayedRef.current = true;
    try {
      const s = phaserRef.current?.sound;
      if (s?.context?.state === 'suspended') s.context.resume();
      s?.play(won ? 'sfx-win' : 'sfx-lose', { volume: getSoundVolumeLS() });
    } catch (e) { /* ignore */ }
  };
  const [boostLabel, setBoostLabel] = useState(null);
  const [debuffLabel, setDebuffLabel] = useState(null);
  const [answerResultLabel, setAnswerResultLabel] = useState(null);
  const [answerResultIsCorrect, setAnswerResultIsCorrect] = useState(null);
  const [boostExiting, setBoostExiting] = useState(false);
  const [debuffExiting, setDebuffExiting] = useState(false);
  const [answerResultExiting, setAnswerResultExiting] = useState(false);
  const boostTimerRef = useRef(null);
  const debuffTimerRef = useRef(null);
  const [showBoostChoiceModal, setShowBoostChoiceModal] = useState(false);
  const [boostCooldownUntil, setBoostCooldownUntil] = useState({
    movementSpeed: null,
    doublePoints: null,
    hint: null,
    health: null,
  });
  const [, setCooldownTick] = useState(0);
  const [timerTick, setTimerTick] = useState(0);
  const [virtualMove, setVirtualMove] = useState(NO_MOVE);
  const [touchControlsReversedUntil, setTouchControlsReversedUntil] = useState(0);
  const [showTouchControls, setShowTouchControls] = useState(false);
  const [isTeacherCompact, setIsTeacherCompact] = useState(false);
  const [teacherSidebarOpen, setTeacherSidebarOpen] = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState({
    selectedIndex: null,
    trueFalse: null,
    fillBlank: '',
    result: null,
    pointsEarned: null,
    boostMessage: null,
  });

  const isTeacher = user?.accountType === 'TEACHER';

  useEffect(() => {
    if (questionModal) {
      setQuestionAnswer({ selectedIndex: null, trueFalse: null, fillBlank: '', result: null, pointsEarned: null, boostMessage: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when modal question/npc identity changes
  }, [questionModal?.question?.questionText, questionModal?.npcIndex]);

  /* Boost notification: auto-hide after 4s with exit animation */
  useEffect(() => {
    if (!boostLabel) return;
    setBoostExiting(false);
    const t1 = setTimeout(() => setBoostExiting(true), 4000);
    const t2 = setTimeout(() => {
      setBoostLabel(null);
      setBoostExiting(false);
    }, 4350);
    boostTimerRef.current = { t1, t2 };
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      boostTimerRef.current = null;
    };
  }, [boostLabel]);

  /* Debuff notification: auto-hide after 4.5s with exit animation */
  useEffect(() => {
    if (!debuffLabel) return;
    setDebuffExiting(false);
    const t1 = setTimeout(() => setDebuffExiting(true), 4500);
    const t2 = setTimeout(() => {
      setDebuffLabel(null);
      setDebuffExiting(false);
    }, 4850);
    debuffTimerRef.current = { t1, t2 };
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      debuffTimerRef.current = null;
    };
  }, [debuffLabel]);

  /* Answer result notification (Correct! / Incorrect): auto-hide after 3s with exit animation */
  const answerResultTimerRef = useRef(null);
  useEffect(() => {
    if (!answerResultLabel) return;
    setAnswerResultExiting(false);
    const t1 = setTimeout(() => setAnswerResultExiting(true), 3000);
    const t2 = setTimeout(() => {
      setAnswerResultLabel(null);
      setAnswerResultIsCorrect(null);
      setAnswerResultExiting(false);
    }, 3350);
    answerResultTimerRef.current = { t1, t2 };
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      answerResultTimerRef.current = null;
    };
  }, [answerResultLabel]);

  /* Boost choice cooldown: each boost has its own 45s cooldown; tick every second to update UI */
  useEffect(() => {
    const anyActive = Object.values(boostCooldownUntil).some((t) => t != null && Date.now() < t);
    if (!anyActive) return;
    const id = setInterval(() => {
      const now = Date.now();
      setBoostCooldownUntil((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const key of Object.keys(next)) {
          if (next[key] != null && now >= next[key]) {
            next[key] = null;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      setCooldownTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [boostCooldownUntil]);

  /* Show steering wheel on mobile and tablet (max-width 1024px) */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handler = () => setShowTouchControls(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* Teacher layout: mobile/tablet viewport uses hamburger sidebar */
  useEffect(() => {
    if (!isTeacher) return;
    const mq = window.matchMedia('(max-width: 1024px)');
    const handler = () => setIsTeacherCompact(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [isTeacher]);

  useEffect(() => {
    if (!isTeacherCompact) setTeacherSidebarOpen(false);
  }, [isTeacherCompact]);

  /* Sync virtual move from steering wheel to Phaser registry */
  useEffect(() => {
    const game = phaserRef.current;
    if (!game?.registry) return;
    const reversed = touchControlsReversedUntil > Date.now();
    game.registry.set('virtualMove', reversed ? invertDirectionalInput(virtualMove) : virtualMove);
  }, [virtualMove, touchControlsReversedUntil]);

  useEffect(() => {
    if (!touchControlsReversedUntil || touchControlsReversedUntil <= Date.now()) {
      if (touchControlsReversedUntil !== 0) setTouchControlsReversedUntil(0);
      return undefined;
    }
    const timeoutId = window.setTimeout(() => {
      setTouchControlsReversedUntil(0);
    }, Math.max(0, touchControlsReversedUntil - Date.now()));
    return () => window.clearTimeout(timeoutId);
  }, [touchControlsReversedUntil]);

  /* Clear virtual move when touch controls are hidden (e.g. game over) */
  useEffect(() => {
    if (!showTouchControls || session?.status !== 'PLAYING') setVirtualMove(NO_MOVE);
  }, [showTouchControls, session?.status]);

  /* Disable Phaser keyboard when question modal is open so WASD types in fill-in-the-blank */
  useEffect(() => {
    const game = phaserRef.current;
    if (!game) return;
    const scene = game.scene?.scenes?.[0];
    const keyboard = scene?.input?.keyboard ?? game.input?.keyboard;
    if (keyboard) {
      const open = !!questionModal || !!showBoostChoiceModal || paused;
      keyboard.enabled = !open;
      if (keyboard.manager) keyboard.manager.enabled = !open;
      if (typeof keyboard.preventDefault !== 'undefined') keyboard.preventDefault = open ? false : true;
    }
    /* Blur canvas and make it non-focusable so keys go to the text input */
    const canvas = gameRef.current?.querySelector?.('canvas');
    if (questionModal && canvas) {
      canvas.setAttribute('tabindex', '-1');
      if (typeof canvas.blur === 'function') canvas.blur();
    }
    return () => {
      if (keyboard) {
        keyboard.enabled = true;
        if (keyboard.manager) keyboard.manager.enabled = true;
        if (typeof keyboard.preventDefault !== 'undefined') keyboard.preventDefault = true;
      }
    };
  }, [questionModal, paused, showBoostChoiceModal]);

  /* Freeze player movement while boost choice modal is open */
  useEffect(() => {
    const game = phaserRef.current;
    if (!game?.registry) return;
    if (showBoostChoiceModal) {
      game.registry.set('playerFrozen', true);
    } else {
      game.registry.set('playerFrozen', false);
      game.registry.set('unfreezeCooldownUntil', Date.now() + 150);
      game.registry.set('unfreezeStuckSnapshotDone', false);
      game.registry.set('stuckMoveKeys', null);
    }
  }, [showBoostChoiceModal]);


  /* Pause/resume Phaser scene and disable keyboard when paused */
  useEffect(() => {
    const game = phaserRef.current;
    if (!game) return;
    const scene = game.scene?.scenes?.[0];
    const keyboard = scene?.input?.keyboard ?? game.input?.keyboard;
    if (paused) {
      try { game.scene.pause('GameScene'); } catch (_) {}
      if (scene && scene._bgmTrack) {
        try { scene._bgmTrack.pause(); } catch (_) {}
      }
      if (keyboard) {
        keyboard.enabled = false;
        if (keyboard.manager) keyboard.manager.enabled = false;
      }
    } else {
      try { game.scene.resume('GameScene'); } catch (_) {}
      if (scene && scene._bgmTrack) {
        try { scene._bgmTrack.resume(); } catch (_) {}
      }
      if (keyboard) {
        keyboard.enabled = true;
        if (keyboard.manager) keyboard.manager.enabled = true;
      }
    }
    return () => {
      if (!paused && keyboard) {
        keyboard.enabled = true;
        if (keyboard.manager) keyboard.manager.enabled = true;
      }
    };
  }, [paused]);

  /* Listen for teacher pause/resume so all players (including students) stay in sync */
  useEffect(() => {
    if (!socket || !sessionId) return;
    const onSetPaused = (data) => {
      setPaused(Boolean(data?.paused));
    };
    socket.on('game-set-paused', onSetPaused);
    return () => socket.off('game-set-paused', onSetPaused);
  }, [socket, sessionId]);

  /* Track paused duration so timer does not count down while paused */
  useEffect(() => {
    if (paused) {
      pauseStartedAtRef.current = Date.now();
    } else {
      if (pauseStartedAtRef.current != null) {
        totalPausedMsRef.current += Date.now() - pauseStartedAtRef.current;
        pauseStartedAtRef.current = null;
      }
    }
  }, [paused]);

  /* =========================
     LOAD SESSION
  ========================= */
  useEffect(() => {
    if (!sessionId) return;

    joinGameSession(sessionId);

    // When teacher navigates from Lobby after "Start Game", use the response session so sidebar shows cleared correct/incorrect
    const stateSession = location.state?.gameSession;
    if (stateSession && String(stateSession.id ?? stateSession._id) === String(sessionId)) {
      setSession(stateSession);
    }

    gameSessionAPI.getGameSessionById(sessionId)
      .then(res => {
        const gs = res.gameSession ?? res;
        // 404 is returned as { gameSession: null, notFound: true } to avoid uncaught rejection
        if (res.notFound === true || !gs) {
          navigate('/my-class', {
            state: { message: 'Game session not found or has ended.', messageType: 'error' },
            replace: true
          });
          return;
        }
        // Single-player is for students only; teachers cannot access the game
        if (user?.accountType === 'TEACHER' && gs?.quiz?.gameMode === 'SINGLE') {
          const classData = location.state?.classData;
          navigate('/classroom', { state: classData ? { classData, activeNav: 'game' } : {}, replace: true });
          return;
        }
        setSession(gs);
        const classId = location.state?.classData?.id ?? location.state?.classData?._id ?? gs?.class?._id ?? gs?.class?.id ?? gs?.class;
        if (classId && user?.accountType === 'TEACHER') {
          joinClass(String(classId));
        }
        const myId = String(user?._id ?? user?.id ?? '');
        const myScore = gs?.players?.find((p) => String(p._id ?? p.id) === myId)?.score;
        if (typeof myScore === 'number' && !Number.isNaN(myScore)) {
          latestScoreRef.current = myScore;
        }
        if (gs?.status === 'PLAYING') {
          pointsThisGameRef.current = 0;
          setStudentPoints(0);
          setHealth(HEALTH_MAX);
          doublePointsRemainingRef.current = 0;
          gameEndedByAllPlayersRef.current = false;
        } else if (gs?.status === 'WAITING') {
          gameEndedByAllPlayersRef.current = true;
        }
        prevStatusRef.current = gs?.status ?? null;
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          navigate('/login', { state: { from: location.pathname }, replace: true });
        } else if (err?.response?.status === 404) {
          // Session not found (deleted, expired, or invalid ID) — go back to class list
          navigate('/my-class', {
            state: { message: 'Game session not found or has ended.', messageType: 'error' },
            replace: true
          });
        }
      })
      .finally(() => setLoading(false));

    return () => {
      leaveGameSession(sessionId);
      const classId = location.state?.classData?.id ?? location.state?.classData?._id;
      if (classId && user?.accountType === 'TEACHER') leaveClass(String(classId));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup depends on sessionId/class/role only; user id stable
  }, [sessionId, joinGameSession, leaveGameSession, joinClass, leaveClass, user?.accountType, location.state?.classData, navigate]);

  /* Re-join game-session (and class for teacher) when socket connects/reconnects, so we receive events after reconnect */
  useEffect(() => {
    if (!socket || !sessionId) return;
    const onConnect = () => {
      joinGameSession(sessionId);
      const classId = session?.class?._id ?? session?.class?.id ?? session?.class ?? location.state?.classData?.id ?? location.state?.classData?._id;
      if (classId && isTeacher) joinClass(String(classId));
    };
    if (socket.connected) onConnect();
    socket.on('connect', onConnect);
    return () => socket.off('connect', onConnect);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run on socket/sessionId/class/role; session ref used inside callback
  }, [socket, sessionId, isTeacher, session?.class, location.state?.classData, joinGameSession, joinClass]);

  /* Listen for game session updates (score changes, status) → update session; teacher sees game over modal, students redirect on stop */
  useEffect(() => {
    if (!socket || !sessionId) return;
    const onUpdate = (data) => {
      const gs = data?.gameSession;
      if (!gs || String(gs.id ?? gs._id) !== String(sessionId)) return;
      if (!isTeacher && prevStatusRef.current !== 'PLAYING' && gs.status === 'PLAYING') {
        setHealth(HEALTH_MAX);
        doublePointsRemainingRef.current = 0;
      }
      prevStatusRef.current = gs.status ?? null;
      setSession(gs);
      if (gs.timeUp) {
        if (isTeacher) {
          setTeacherGameOverModal(true);
        } else {
          const totalQuestions = phaserRef.current?.registry?.get('quizQuestions')?.length ?? gs?.totalQuestionsPerPlayer ?? 0;
          try {
            const h = healthRef.current ?? HEALTH_MAX;
            playGameOverSoundOnce(h > 0);
          } catch (e) { /* ignore */ }
          setGameOverModal({
            correct: totalCorrectRef.current ?? 0,
            total: totalQuestions || 0,
            points: Number.isFinite(Number(pointsThisGameRef.current)) ? Number(pointsThisGameRef.current) : 0,
            health: healthRef.current ?? HEALTH_MAX,
          });
        }
        return;
      }
      if (gs.allPlayersFinished) {
        gameEndedByAllPlayersRef.current = true;
        setShowGoToLobbyModal(false);
        if (isTeacher) {
          setTeacherGameOverModal(true);
        } else {
          // Show game over modal for students when all players have finished (e.g. last student just finished)
          const totalQuestions = phaserRef.current?.registry?.get('quizQuestions')?.length ?? gs?.totalQuestionsPerPlayer ?? 0;
          if (totalQuestions > 0) {
            try {
              const h = healthRef.current ?? HEALTH_MAX;
              playGameOverSoundOnce(h > 0);
            } catch (e) { /* ignore */ }
            setGameOverModal({
              correct: totalCorrectRef.current ?? 0,
              total: totalQuestions || 0,
              points: Number.isFinite(Number(pointsThisGameRef.current)) ? Number(pointsThisGameRef.current) : 0,
              health: healthRef.current ?? HEALTH_MAX,
            });
          }
        }
        // Do not redirect to lobby when game ended because all players finished; let them use "View Leaderboard" instead
        return;
      }
      if (gs.status === 'WAITING') {
        // Never auto-redirect. Teacher stopped the game: both teacher and students see "Go to Lobby" modal.
        if (!gameEndedByAllPlayersRef.current) {
          setShowGoToLobbyModal(true);
        }
      } else if (gs.status === 'FINISHED') {
        if (isTeacher) {
          setShowGoToLobbyModal(true);
        } else {
          gameSessionAPI.leaveGameSession(sessionId).catch(() => {});
          leaveGameSession(sessionId);
          navigate(`/lobby/${sessionId}`, { state: { gameSession: gs }, replace: true });
        }
      }
    };
    socket.on('game-session-updated', onUpdate);
    const onAllPlayersFinished = (data) => {
      if (String(data?.sessionId) === String(sessionId) && isTeacher) {
        setTeacherGameOverModal(true);
      }
    };
    socket.on('game-all-players-finished', onAllPlayersFinished);
    const onSessionDeleted = (data) => {
      if (String(data?.sessionId) === String(sessionId)) {
        leaveGameSession(sessionId);
        if (!isTeacher) setShowGoToLobbyModal(true);
      }
    };
    socket.on('game-session-deleted', onSessionDeleted);
    return () => {
      socket.off('game-session-updated', onUpdate);
      socket.off('game-all-players-finished', onAllPlayersFinished);
      socket.off('game-session-deleted', onSessionDeleted);
    };
  }, [socket, sessionId, navigate, isTeacher, leaveGameSession]);

  /* Snapshot player scores at game start so teacher sidebar shows points this game only */
  useEffect(() => {
    if (!isTeacher || !session) return;
    if (session.status === 'PLAYING') {
      if (Object.keys(playerScoresAtStartRef.current).length === 0) {
        const snap = {};
        (session.players || []).forEach((p) => {
          const id = String(p._id ?? p.id ?? '');
          snap[id] = p.score ?? p.points ?? 0;
        });
        playerScoresAtStartRef.current = snap;
      }
    } else {
      playerScoresAtStartRef.current = {};
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we only want to snapshot when status/players change, not every session field
  }, [isTeacher, session?.status, session?.players]);

  /* When game is WAITING (e.g. all players finished), show teacher game over modal so they can redirect */
  useEffect(() => {
    if (isTeacher && session?.status === 'WAITING') {
      setTeacherGameOverModal(true);
    }
  }, [isTeacher, session?.status]);

  /* Polling: teacher calls check-game-over which detects if all players finished and updates/emits; shows modal on WAITING or allPlayersFinished */
  useEffect(() => {
    if (!isTeacher || !sessionId || session?.status !== 'PLAYING') return;
    const poll = () => {
      gameSessionAPI.checkGameOver(sessionId)
        .then((res) => {
          const gs = res?.gameSession ?? res;
          if (gs && (gs.status === 'WAITING' || gs.status === 'FINISHED' || gs.allPlayersFinished)) {
            setSession(gs);
            setTeacherGameOverModal(true);
          }
        })
        .catch(() => {});
    };
    const t = setTimeout(poll, 500);
    const id = setInterval(poll, 1000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearTimeout(t);
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isTeacher, sessionId, session?.status]);

  /* Reset time-up flag when game is no longer playing */
  useEffect(() => {
    if (session?.status !== 'PLAYING') {
      timeUpCalledRef.current = false;
      totalPausedMsRef.current = 0;
      pauseStartedAtRef.current = null;
    }
  }, [session?.status]);

  /* Reset teacher-stopped flag when game is playing again (new round) */
  useEffect(() => {
    if (session?.status === 'PLAYING') teacherStoppedGameRef.current = false;
  }, [session?.status]);

  useEffect(() => {
    if (session?.status === 'PLAYING') gameOverSoundPlayedRef.current = false;
  }, [session?.status]);

  /* Timer: tick every second while playing (and not paused) so display updates */
  useEffect(() => {
    if (session?.status !== 'PLAYING' || paused) return;
    const id = setInterval(() => setTimerTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [session?.status, paused]);

  /* Ensure finish is saved when student sees game over (fallback in case inline paths miss) */
  useEffect(() => {
    if (!gameOverModal || isTeacher || !sessionId || recordFinishCalledRef.current) return;
    recordFinishCalledRef.current = true;
    const correctCount = gameOverModal.correct ?? totalCorrectRef.current ?? 0;
    const startedAtMs = session?.startedAt ? new Date(session.startedAt).getTime() : null;
    const timeToFinishSeconds = startedAtMs ? (Date.now() - startedAtMs) / 1000 : 0;
    gameSessionAPI.recordPlayerFinish(sessionId, {
      correctCount,
      timeToFinishSeconds,
      points: Number(pointsThisGameRef.current ?? 0)
    }).catch((err) => console.warn('Record finish failed:', err));
  }, [gameOverModal, isTeacher, sessionId, session?.startedAt]);

  /* Stop BGM when game over modal is shown */
  useEffect(() => {
    if (!gameOverModal) return;
    const scene = phaserRef.current?.scene?.scenes?.[0];
    if (scene?._bgmTrack) {
      try { scene._bgmTrack.stop(); } catch (_) {}
    }
  }, [gameOverModal]);

  /* Stop BGM when game is stopped by teacher (status no longer PLAYING) */
  useEffect(() => {
    if (session?.status === 'PLAYING') return;
    const scene = phaserRef.current?.scene?.scenes?.[0];
    if (scene?._bgmTrack) {
      try { scene._bgmTrack.stop(); } catch (_) {}
    }
  }, [session?.status]);

  /* When countdown reaches zero, end the game (call API once). Do not count time while paused. */
  useEffect(() => {
    if (session?.status !== 'PLAYING' || !sessionId || paused) return;
    const timeLimitSec = session?.quiz?.timeLimit != null ? Number(session.quiz.timeLimit) : null;
    const startedAtMs = session?.startedAt ? new Date(session.startedAt).getTime() : null;
    if (timeLimitSec == null || timeLimitSec <= 0 || !startedAtMs) return;
    const totalPausedSoFar = totalPausedMsRef.current + (pauseStartedAtRef.current != null ? Date.now() - pauseStartedAtRef.current : 0);
    const effectiveElapsedSec = (Date.now() - startedAtMs - totalPausedSoFar) / 1000;
    const remainingSec = timeLimitSec - effectiveElapsedSec;
    if (remainingSec <= 0 && !timeUpCalledRef.current) {
      timeUpCalledRef.current = true;
      if (!isTeacher && !recordFinishCalledRef.current) {
        recordFinishCalledRef.current = true;
        const correctCount = totalCorrectRef.current ?? 0;
        const timeToFinishSeconds = effectiveElapsedSec;
        gameSessionAPI.recordPlayerFinish(sessionId, {
          correctCount,
          timeToFinishSeconds,
          points: Number(pointsThisGameRef.current ?? 0)
        }).catch((err) => console.warn('Record finish (time up) failed:', err));
      }
      gameSessionAPI
        .endByTime(sessionId)
        .then((res) => {
          const gs = res?.gameSession ?? res;
          if (gs) setSession(gs);
        })
        .catch((err) => console.warn('End by time failed:', err));
    }
  }, [session?.status, sessionId, session?.quiz?.timeLimit, session?.startedAt, timerTick, isTeacher, paused]);

  const timeLimitSec = session?.quiz?.timeLimit != null ? Number(session.quiz.timeLimit) : null;
  const startedAtMs = session?.startedAt ? new Date(session.startedAt).getTime() : null;
  const totalPausedSoFar = totalPausedMsRef.current + (paused && pauseStartedAtRef.current != null ? Date.now() - pauseStartedAtRef.current : 0);
  const now = timerTick ? Date.now() : (startedAtMs || 0);
  let timerDisplay = '';
  if (session?.status === 'PLAYING' && startedAtMs) {
    const elapsedSec = (now - startedAtMs - totalPausedSoFar) / 1000;
    if (timeLimitSec != null && timeLimitSec > 0) {
      const remainingSec = Math.max(0, timeLimitSec - elapsedSec);
      const m = Math.floor(remainingSec / 60);
      const s = Math.floor(remainingSec % 60);
      timerDisplay = `${m}:${s.toString().padStart(2, '0')}`;
    } else {
      const m = Math.floor(elapsedSec / 60);
      const s = Math.floor(elapsedSec % 60);
      timerDisplay = `Elapsed: ${m}:${s.toString().padStart(2, '0')}`;
    }
  }

  /* =========================
     FULLSCREEN PORTAL ROOT
  ========================= */
  useLayoutEffect(() => {
    document.body.classList.add('gameplay-active');
    const root = document.createElement('div');
    root.id = GAMEPLAY_ROOT_ID;

    Object.assign(root.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      width: '100vw',
      height: '100vh',
      minWidth: '100vw',
      minHeight: '100vh',
      margin: '0',
      padding: '0',
      overflow: 'hidden',
      zIndex: '9999',
      background: '#000',
      boxSizing: 'border-box',
    });

    document.body.appendChild(root);
    portalRootRef.current = root;
    setPortalReady(true);

    return () => {
      document.body.classList.remove('gameplay-active');
      root.remove();
      portalRootRef.current = null;
    };
  }, []);

  /* =========================
     INIT PHASER
  ========================= */
  useEffect(() => {
    if (loading || !gameRef.current) return;
    if (!isTeacher && !session) return;

    let cancelled = false;
    const cleanupRef = { current: null };
    const parent = gameRef.current;
    const root = document.getElementById(GAMEPLAY_ROOT_ID);

    if (phaserRef.current) {
      try { phaserRef.current.destroy(true); } catch (_) {}
      phaserRef.current = null;
    }
    if (root) {
      root.querySelectorAll('canvas').forEach((c) => c.remove());
    }
    while (parent.firstChild) parent.removeChild(parent.firstChild);

    const getSize = () => {
      const p = gameRef.current;
      if (p && p.clientWidth > 0 && p.clientHeight > 0) {
        return { w: p.clientWidth, h: p.clientHeight };
      }
      return { w: Math.max(400, window.innerWidth), h: Math.max(300, window.innerHeight || 600) };
    };

    const { w: rawW, h: rawH } = getSize();
    // WebGL framebuffers need non-zero dimensions; some GPUs fail with 0x0 or very small sizes
    const w = Math.max(64, rawW);
    const h = Math.max(64, rawH);

    const config = {
      type: Phaser.AUTO,
      parent,
      width: w,
      height: h,
      backgroundColor: '#000',
      scene: GameScene,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },

      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NONE,
      },

      audio: {
        disableWebAudio: false,
      },

      roundPixels: true,
    };
    config.getHealth = () => healthRef.current ?? HEALTH_MAX;
    config.getSoundVolume = getSoundVolumeLS;
    config.getMusicVolume = getMusicVolumeLS;

    (async () => {
      // Fetch latest session from server so both users get the same npcSeed (set when teacher starts game)
      let latestSession = session;
      try {
        const res = await gameSessionAPI.getGameSessionById(sessionId);
        latestSession = res.gameSession ?? res;
      } catch (e) {
        console.warn('Could not refetch session for npcSeed, using cached session:', e);
      }
      if (cancelled) return;
      if (!latestSession && !session) return; // 404 / not found — initial load will redirect

      let quizFromState = location.state?.quiz?.questions || location.state?.gameSession?.quiz?.questions;
      let quizFromSession = latestSession?.quiz?.questions || session?.quiz?.questions || [];
      let quizQuestions = Array.isArray(quizFromState) && quizFromState.length > 0
        ? quizFromState
        : (Array.isArray(quizFromSession) && quizFromSession.length > 0 ? quizFromSession : []);

      if (quizQuestions.length === 0 && (latestSession?.quiz || session?.quiz)) {
        const quizId = (latestSession?.quiz || session?.quiz)?.id ?? (latestSession?.quiz || session?.quiz)?._id;
        if (quizId) {
          try {
            const res = await quizAPI.getQuizById(quizId);
            const fullQuiz = res.quiz ?? res;
            if (fullQuiz?.questions && Array.isArray(fullQuiz.questions) && fullQuiz.questions.length > 0) {
              quizQuestions = fullQuiz.questions;
            }
          } catch (e) {
            console.warn('Could not fetch quiz questions for gameplay:', e);
          }
        }
      }
      if (cancelled) return;

      // Defer boot until parent has valid dimensions; Phaser WebGL framebuffers fail on 0x0
      const ensureParentReady = () =>
        new Promise((resolve) => {
          let attempts = 0;
          const maxAttempts = 60; // ~1 second
          const check = () => {
            if (parent.clientWidth >= 64 && parent.clientHeight >= 64) {
              resolve();
              return;
            }
            if (++attempts >= maxAttempts) resolve(); // proceed anyway after timeout
            else requestAnimationFrame(check);
          };
          requestAnimationFrame(check);
        });
      await ensureParentReady();
      if (cancelled) return;

      const sessionMap = latestSession?.map ?? session?.map ?? location.state?.gameSession?.map ?? location.state?.map ?? null;
      config.scene = new GameScene(sessionMap);

      let game;
      try {
        game = new Phaser.Game(config);
      } catch (bootErr) {
        // WebGL "Framebuffer status: Incomplete Attachment" happens on some GPUs/drivers when
        // framebuffers get invalid dimensions (e.g. Scale.RESIZE with hidden/zero-sized parent).
        // Fall back to Canvas renderer which avoids WebGL entirely.
        const msg = bootErr?.message || String(bootErr);
        if (msg.includes('Framebuffer') || msg.includes('Incomplete Attachment')) {
          config.type = Phaser.CANVAS;
          game = new Phaser.Game(config);
        } else {
          throw bootErr;
        }
      }
      phaserRef.current = game;
      const isSinglePlayer = latestSession?.quiz?.gameMode === 'SINGLE' || session?.quiz?.gameMode === 'SINGLE';
      game.registry.set('isStudent', isSinglePlayer || !isTeacher);
      game.registry.set('socket', socket);
      game.registry.set('userId', user?._id || user?.id);
      game.registry.set('sessionId', sessionId);
      game.registry.set('playerName', [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Player');
      game.registry.set('playerGender', user?.gender ?? null);
      game.registry.set('map', sessionMap);
      const rawPlayers = latestSession?.players ?? session?.players ?? [];
      const myId = String(user?._id ?? user?.id ?? '');
      // Deduplicate by player id so notification join + lobby join never show same player twice
      const seenIds = new Set();
      const players = Array.isArray(rawPlayers)
        ? rawPlayers.filter((p) => {
            const pid = p && String(p._id ?? p.id ?? '');
            if (!pid || seenIds.has(pid)) return false;
            seenIds.add(pid);
            return true;
          })
        : [];
      game.registry.set('players', players);
      const playerCount = Math.max(1, players.length);
      const myPlayerIndex = players.findIndex((p) => p && String(p._id ?? p.id) === myId);
      game.registry.set('playerCount', playerCount);
      game.registry.set('myPlayerIndex', myPlayerIndex >= 0 ? myPlayerIndex : 0);
      game.registry.set('npcSeed', latestSession?.npcSeed ?? session?.npcSeed ?? null);
      const quizQuestionCount = quizQuestions.length || latestSession?.quiz?.questionCount || session?.quiz?.questionCount || 0;
      game.registry.set('quizQuestionCount', quizQuestionCount);
      game.registry.set('quizQuestions', quizQuestions);
      game.registry.set('onNpcCollision', (question, npcIndex) => {
        // Defer state update to next frame so it runs outside the physics tick and reliably triggers React render
        requestAnimationFrame(() => {
          setQuestionModal(question ? { question, npcIndex } : null);
        });
      });
      if (isTeacher) {
        game.registry.set('onPlayerHealth', (playerId, healthVal) => {
          setPlayerHealthMap((prev) => ({ ...prev, [playerId]: healthVal }));
        });
      }

      const forceCanvasFullSize = () => {
        const canvas = parent?.querySelector('canvas');
        if (canvas) {
          canvas.style.cssText =
            'position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;display:block!important;z-index:0!important;';
        }
      };

      const MIN_SIZE = 64; // WebGL framebuffers fail on very small dimensions
      const safeResize = (nw, nh) => {
        const w = Math.max(MIN_SIZE, nw);
        const h = Math.max(MIN_SIZE, nh);
        try {
          phaserRef.current?.scale?.resize(w, h);
        } catch (e) {
          if (!String(e?.message || e).includes('Framebuffer')) throw e;
        }
      };
      const onResize = () => {
        const { w: nw, h: nh } = getSize();
        if (phaserRef.current && nw > 0 && nh > 0) safeResize(nw, nh);
        forceCanvasFullSize();
      };

      const ro = new ResizeObserver(() => {
        const { w: nw, h: nh } = getSize();
        if (phaserRef.current && nw > 0 && nh > 0) safeResize(nw, nh);
        forceCanvasFullSize();
      });
      ro.observe(parent);

      window.addEventListener('resize', onResize);
      const raf = requestAnimationFrame(forceCanvasFullSize);
      const t1 = setTimeout(forceCanvasFullSize, 50);
      const t2 = setTimeout(forceCanvasFullSize, 200);
      const t3 = setTimeout(forceCanvasFullSize, 500);
      const interval = setInterval(forceCanvasFullSize, 200);
      const stopInterval = setTimeout(() => clearInterval(interval), 2000);

      const syncGameSize = () => {
        const { w: nw, h: nh } = getSize();
        if (phaserRef.current && nw > 0 && nh > 0) {
          safeResize(nw, nh);
          forceCanvasFullSize();
        }
      };
      const tSync1 = setTimeout(syncGameSize, 50);
      const tSync2 = setTimeout(syncGameSize, 200);
      const tSync3 = setTimeout(syncGameSize, 500);

      cleanupRef.current = () => {
        ro.disconnect();
        cancelAnimationFrame(raf);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(tSync1);
        clearTimeout(tSync2);
        clearTimeout(tSync3);
        clearTimeout(stopInterval);
        clearInterval(interval);
        window.removeEventListener('resize', onResize);
        try { game.destroy(true); } catch (_) {}
        phaserRef.current = null;
      };
    })();

    return () => {
      cancelled = true;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
    // Only init game when loading finishes or sessionId changes; do NOT re-run when session updates (e.g. score) or game would reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sessionId]);

  /* =========================
     STOP GAME (teacher only) / LEAVE (game-testing as student)
  ========================= */
  const isGameTesting = location.pathname.startsWith('/game-testing');

  const handleStopGame = async () => {
    const sid = sessionId || session?.id || session?._id;
    if (!sid || !isTeacher) return;

    teacherStoppedGameRef.current = true;
    setStopping(true);
    try {
      // Set status to FINISHED so backend sets WAITING (session stays; map preserved for next round)
      const res = await gameSessionAPI.updateGameSession(sid, { status: 'FINISHED' });
      const updatedSession = res?.gameSession ?? res;
      if (updatedSession) setSession(updatedSession);
      setTeacherGameOverModal(true);
      // Keep teacher in lobby: navigate to lobby with updated session so they can start again with same map
      navigate(`/lobby/${sid}`, { state: { gameSession: updatedSession || session, fromStopGame: true }, replace: true });
    } catch (err) {
      console.error('Stop game failed:', err);
      alert(err.response?.data?.message || 'Failed to stop game.');
    } finally {
      setStopping(false);
    }
  };

  const handleStopOrLeaveGame = async () => {
    const sid = sessionId || session?.id || session?._id;
    if (!sid) return;
    if (isTeacher) {
      handleStopGame();
      return;
    }
    if (isGameTesting) {
      setStopping(true);
      try {
        leaveGameSession(sid);
        await gameSessionAPI.leaveGameSession(sid).catch(() => {});
        navigate('/my-class', { replace: true });
      } finally {
        setStopping(false);
      }
    }
  };

  if (loading) return null;

  const teacherMobileLayout = isTeacher && isTeacherCompact;
  const teacherSidebarInner = isTeacher ? (
    <>
      <div
        style={{
          padding: teacherMobileLayout ? '10px 12px' : '16px 20px',
          borderBottom: `1px solid ${GAME_MODAL_BORDER}`,
          background: `linear-gradient(180deg, ${GAME_MODAL_PRIMARY} 0%, ${GAME_MODAL_SECONDARY} 100%)`,
          color: GAME_MODAL_TEXT,
          fontSize: teacherMobileLayout ? '0.9rem' : '1rem',
          fontWeight: 700,
          letterSpacing: '0.02em',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <span style={{ flex: 1, textAlign: 'center' }}>Players</span>
        {teacherMobileLayout && (
          <button
            onClick={() => setTeacherSidebarOpen(false)}
            aria-label="Close players panel"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: `1px solid ${GAME_MODAL_BORDER}`,
              background: 'rgba(255,255,255,0.16)',
              color: GAME_MODAL_TEXT,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <FaTimes />
          </button>
        )}
      </div>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: teacherMobileLayout ? '8px 10px' : '12px 16px',
          background: GAME_MODAL_SURFACE,
        }}
      >
        {(session?.players || []).length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.875rem', padding: 12 }}>
            No players in session yet.
          </div>
        ) : (
          (session?.players || []).map((p) => {
            const id = String(p._id ?? p.id ?? '');
            const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Player';
            const rawScore = typeof p.score === 'number' ? p.score : 0;
            const startScore = playerScoresAtStartRef.current[id] ?? 0;
            const score = Math.max(0, rawScore - startScore);
            const correctCount = typeof p.correctCount === 'number' ? p.correctCount : 0;
            const avatarSrc = getAvatarSrc(p.profilePicture, p.gender);
            const avatarBg = getAvatarBgColor(p.profilePicture || getDefaultAvatarByGender(p.gender));
            return (
              <div
                key={id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: teacherMobileLayout ? 8 : 12,
                  padding: teacherMobileLayout ? '8px 10px' : '10px 12px',
                  marginBottom: teacherMobileLayout ? 6 : 8,
                  background: GAME_MODAL_SURFACE_ALT,
                  borderRadius: 10,
                  border: `1px solid ${GAME_MODAL_BORDER}`,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.16)',
                }}
              >
                <div
                  style={{
                    width: teacherMobileLayout ? 32 : 40,
                    height: teacherMobileLayout ? 32 : 40,
                    borderRadius: '50%',
                    backgroundColor: avatarBg,
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={avatarSrc}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      color: GAME_MODAL_TEXT,
                      fontSize: teacherMobileLayout ? '0.8rem' : '0.875rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {fullName}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginTop: 4,
                      fontSize: teacherMobileLayout ? '0.7rem' : '0.75rem',
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    <span>{t('gameplay_scoreLabel')}: <strong style={{ color: '#ffffff' }}>{score}</strong></span>
                    <span>{t('gameplay_correctLabel')}: <strong style={{ color: '#fef3c7' }}>{correctCount}</strong></span>
                    {session?.status === 'PLAYING' && (
                      <span>{t('gameplay_healthLabel')}: <strong style={{ color: '#ffffff' }}>{(typeof p.health === 'number' ? p.health : HEALTH_MAX)}/{HEALTH_MAX}</strong></span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  ) : null;

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: teacherMobileLayout ? 'column' : 'row',
        width: '100vw',
        height: '100vh',
        minWidth: '100vw',
        minHeight: '100vh',
        boxSizing: 'border-box',
        background: isTeacher ? '#111' : '#000',
      }}
    >
      <style>{`
        @keyframes gameNotifPop {
          0% { opacity: 0; transform: translate(-50%, -24px) scale(0.7); }
          50% { transform: translate(-50%, 6px) scale(1.08); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes gameNotifOut {
          0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -20px) scale(0.92); }
        }
        .game-notif-pop {
          animation: gameNotifPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .game-notif-out {
          animation: gameNotifOut 0.35s ease-in forwards;
        }
        .game-boost-btn {
          transition: transform 0.25s cubic-bezier(0.34, 1.2, 0.64, 1), filter 0.25s ease, box-shadow 0.25s ease, background-color 0.2s ease;
        }
        .game-boost-btn:hover:not(:disabled) {
          transform: scale(1.04) translateY(-3px);
          filter: brightness(1.2);
          box-shadow: 0 8px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08);
        }
        .game-boost-btn:active:not(:disabled) {
          transform: scale(1.01) translateY(-1px);
          transition-duration: 0.1s;
        }
        .game-question-btn {
          transition: transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1), filter 0.22s ease, border-color 0.22s ease, background-color 0.2s ease;
        }
        .game-question-btn:hover:not(:disabled) {
          transform: scale(1.02) translateY(-2px);
          filter: brightness(1.15);
          border-color: rgba(255,255,255,0.45) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .game-question-btn:active:not(:disabled) {
          transform: scale(0.99) translateY(0);
          transition-duration: 0.1s;
        }
        .game-question-submit {
          transition: transform 0.25s cubic-bezier(0.34, 1.2, 0.64, 1), filter 0.25s ease, box-shadow 0.25s ease;
        }
        .game-question-submit:hover:not(:disabled) {
          transform: scale(1.04) translateY(-2px);
          filter: brightness(1.2);
          box-shadow: 0 6px 16px rgba(120, 145, 83, 0.4);
        }
        .game-question-submit:active:not(:disabled) {
          transform: scale(1.01) translateY(0);
          transition-duration: 0.1s;
        }
        .teacher-toolbar-btn {
          transition: transform 0.25s cubic-bezier(0.34, 1.2, 0.64, 1), filter 0.25s ease, box-shadow 0.25s ease, background-color 0.2s ease;
          animation: teacherBtnFadeIn 0.35s ease-out backwards;
        }
        .teacher-toolbar-btn:nth-child(1) { animation-delay: 0.05s; }
        .teacher-toolbar-btn:nth-child(2) { animation-delay: 0.1s; }
        .teacher-toolbar-btn:hover:not(:disabled) {
          transform: scale(1.06) translateY(-3px);
          filter: brightness(1.2);
          box-shadow: 0 8px 20px rgba(0,0,0,0.35);
        }
        .teacher-toolbar-btn:active:not(:disabled) {
          transform: scale(1.02) translateY(-1px);
          transition-duration: 0.1s;
        }
        @keyframes teacherBtnFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {isTeacher && !teacherMobileLayout && (
        <aside
          style={{
            width: 280,
            flexShrink: 0,
            background: `linear-gradient(180deg, ${GAME_MODAL_PRIMARY} 0%, ${GAME_MODAL_SURFACE} 100%)`,
            borderRight: `2px solid ${GAME_MODAL_SECONDARY}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'Poppins, sans-serif',
            boxShadow: '8px 0 24px rgba(0,0,0,0.22)',
          }}
        >
          {teacherSidebarInner}
        </aside>
      )}

      {isTeacher && teacherMobileLayout && teacherSidebarOpen && (
        <div
          role="dialog"
          aria-label="Players panel"
          onClick={() => setTeacherSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(340px, 88vw)',
              height: '100%',
              background: `linear-gradient(180deg, ${GAME_MODAL_PRIMARY} 0%, ${GAME_MODAL_SURFACE} 100%)`,
              borderRight: `2px solid ${GAME_MODAL_SECONDARY}`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: 'Poppins, sans-serif',
              boxShadow: '8px 0 24px rgba(0,0,0,0.28)',
            }}
          >
            {teacherSidebarInner}
          </div>
        </div>
      )}

      {/* Gameplay area */}
      <div
        style={{
          flex: '1 1 0%',
          minWidth: 0,
          minHeight: teacherMobileLayout ? 0 : undefined,
          width: teacherMobileLayout ? '100%' : 0,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
        }}
      >
        {session?.status === 'PLAYING' && timerDisplay && !isTeacher && (
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              color: '#fff',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: '1.75rem',
              letterSpacing: '0.05em',
              textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
            }}
          >
            {timerDisplay}
          </div>
        )}

        {!isTeacher && answerResultLabel && (
          <div
            className={`game-notif-pop ${answerResultExiting ? 'game-notif-out' : ''}`}
            style={{
              position: 'absolute',
              top: 80,
              left: '50%',
              zIndex: 25,
              padding: '16px 32px',
              color: answerResultIsCorrect ? '#86efac' : '#fca5a5',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: '1.5rem',
              letterSpacing: '0.02em',
              textShadow: answerResultIsCorrect
                ? '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6), 0 0 4px rgba(34,197,94,0.8)'
                : '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6), 0 0 4px rgba(239,68,68,0.6)',
            }}
          >
            {answerResultLabel}
          </div>
        )}

        {!isTeacher && boostLabel && (
          <div
            className={`game-notif-pop ${boostExiting ? 'game-notif-out' : ''}`}
            style={{
              position: 'absolute',
              top: answerResultLabel ? 140 : 80,
              left: '50%',
              zIndex: 25,
              padding: '16px 32px',
              color: '#fef08a',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: '1.5rem',
              letterSpacing: '0.02em',
              textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6), 0 0 4px rgba(251,191,36,0.8)',
            }}
          >
            {boostLabel}
          </div>
        )}

        {!isTeacher && debuffLabel && (
          <div
            className={`game-notif-pop ${debuffExiting ? 'game-notif-out' : ''}`}
            style={{
              position: 'absolute',
              top: answerResultLabel ? (boostLabel ? 200 : 140) : (boostLabel ? 140 : 80),
              left: '50%',
              zIndex: 25,
              padding: '16px 32px',
              color: '#fca5a5',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: '1.5rem',
              letterSpacing: '0.02em',
              textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6), 0 0 4px rgba(239,68,68,0.6)',
            }}
          >
            {debuffLabel}
          </div>
        )}

        {isTeacher ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: teacherMobileLayout ? '10px 12px' : '20px 20px 0 20px',
              paddingLeft: teacherMobileLayout ? 12 : undefined,
              paddingRight: teacherMobileLayout ? 12 : 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 1 auto', minWidth: 0 }}>
              {teacherMobileLayout && (
                <button
                  className="teacher-toolbar-btn"
                  onClick={() => setTeacherSidebarOpen(true)}
                  aria-label="Open players panel"
                  style={{
                    padding: '8px 12px',
                    background: GAME_MODAL_PRIMARY,
                    color: GAME_MODAL_TEXT,
                    border: `1px solid ${GAME_MODAL_BORDER}`,
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: 'Poppins, sans-serif',
                    flexShrink: 0,
                    boxShadow: '0 6px 16px rgba(0,0,0,0.22)',
                  }}
                >
                  <FaBars />
                  <span style={{ fontSize: '0.9rem' }}>Players</span>
                </button>
              )}
              {session?.status === 'PLAYING' && timerDisplay && (
                <div
                  style={{
                    color: '#fff',
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 700,
                    fontSize: teacherMobileLayout ? '1.25rem' : '1.75rem',
                    letterSpacing: '0.05em',
                    textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
                    flex: '0 0 auto',
                    whiteSpace: 'nowrap',
                    position: teacherMobileLayout ? 'static' : 'absolute',
                    left: teacherMobileLayout ? undefined : '50%',
                    top: teacherMobileLayout ? undefined : 20,
                    transform: teacherMobileLayout ? undefined : 'translateX(-50%)',
                  }}
                >
                  {timerDisplay}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            {session?.status === 'WAITING' ? (
              <button
                className="teacher-toolbar-btn"
                onClick={() => {
                  const rawClass = session?.class ?? location?.state?.classData;
                  const classData = rawClass ? { ...(typeof rawClass === 'object' ? rawClass : {}), id: rawClass._id ?? rawClass.id, _id: rawClass._id ?? rawClass.id } : null;
                  const root = document.getElementById(GAMEPLAY_ROOT_ID);
                  if (root) root.remove();
                  document.body.classList.remove('gameplay-active');
                  if (classData && (classData._id || classData.id)) {
                    navigate(`/lobby/${sessionId}`, { state: { gameSession: session, classData }, replace: true });
                  } else {
                    navigate('/lobby/' + sessionId, { state: { gameSession: session }, replace: true });
                  }
                }}
                style={{ padding: teacherMobileLayout ? '8px 12px' : '10px 16px', fontSize: teacherMobileLayout ? '0.875rem' : undefined, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
              >
                {t('gameplay_backToLobby')}
              </button>
            ) : (
              <>
                {session?.status === 'PLAYING' && (
                  <button
                    className="teacher-toolbar-btn"
                    onClick={() => {
                      const next = !paused;
                      setPaused(next);
                      if (sessionId) socket?.emit('game-set-paused', { sessionId, paused: next });
                    }}
                    style={{
                      padding: teacherMobileLayout ? '8px 12px' : '10px 16px',
                      fontSize: teacherMobileLayout ? '0.875rem' : undefined,
                      background: paused ? '#16a34a' : '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {paused ? <><FaPlay /> {t('gameplay_resume')}</> : <><FaPause /> {t('gameplay_pause')}</>}
                  </button>
                )}
                <button
                  className="teacher-toolbar-btn"
                  onClick={handleStopGame}
                  disabled={stopping}
                  style={{
                    padding: teacherMobileLayout ? '8px 12px' : '10px 16px',
                    fontSize: teacherMobileLayout ? '0.875rem' : undefined,
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: stopping ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <FaStop /> {t('gameplay_stopGame')}
                </button>
              </>
            )}
            </div>
          </div>
        ) : (
          <>
            {showTouchControls && session?.status === 'PLAYING' && (
              <SteeringWheel
                onMove={setVirtualMove}
                disabled={paused || !!questionModal || !!showBoostChoiceModal}
              />
            )}
            <div
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                zIndex: 20,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: 24,
                  minWidth: 100,
                  width: 120,
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: 8,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${Math.max(0, Math.min(100, (health / HEALTH_MAX) * 100))}%`,
                    background: health > 50 ? '#22c55e' : health > 25 ? '#eab308' : '#ef4444',
                    borderRadius: 8,
                    transition: 'width 0.3s ease, background 0.2s ease',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '1rem',
                    fontWeight: 700,
                    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                  }}
                >
                  {health}/{HEALTH_MAX}
                </div>
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {isGameTesting && (
                <button
                  type="button"
                  onClick={handleStopOrLeaveGame}
                  disabled={stopping}
                  style={{
                    padding: '8px 14px',
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: stopping ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '0.875rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  <FaStop /> {t('gameplay_stopGame')}
                </button>
              )}
              <span
                style={{
                  color: '#fff',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                }}
              >
                Points: {studentPoints}
              </span>
            </div>
          </>
        )}

        <div
          ref={gameRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            minWidth: '100%',
            minHeight: '100%',
          }}
        />

        {paused && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: GAME_MODAL_OVERLAY,
              gap: 24,
            }}
          >
            <div
              style={{
                color: GAME_MODAL_TEXT,
                fontFamily: 'Poppins, sans-serif',
                fontSize: '2rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
              }}
            >
              PAUSED
            </div>
            {isTeacher ? (
              <button
                className="teacher-toolbar-btn"
                onClick={() => {
                  setPaused(false);
                  if (sessionId) socket?.emit('game-set-paused', { sessionId, paused: false });
                }}
                style={{
                  padding: '12px 24px',
                  background: GAME_MODAL_PRIMARY,
                  color: GAME_MODAL_TEXT,
                  border: `1px solid ${GAME_MODAL_BORDER}`,
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '1rem',
                  boxShadow: '0 6px 16px rgba(120, 145, 83, 0.35)',
                }}
              >
                <FaPlay /> {t('gameplay_resume')}
              </button>
            ) : (
              <div style={{ color: GAME_MODAL_TEXT, fontFamily: 'Poppins, sans-serif', fontSize: '1rem' }}>
                {t('gameplay_pausedByTeacher')}
              </div>
            )}
          </div>
        )}

        {questionModal && questionModal.question && (() => {
          const q = questionModal.question;
          const type = q.questionType || 'qanda';
          const { selectedIndex, trueFalse, fillBlank, result } = questionAnswer;

          const canSubmit = result === null && (
            (type === 'qanda' && selectedIndex !== null) ||
            (type === 'truefalse' && trueFalse !== null) ||
            (type === 'fillblank' && fillBlank.trim() !== '')
          );

          const handleSubmit = () => {
            if (!canSubmit) return;
            let correct = false;
            if (type === 'qanda' && q.answers && q.answers[selectedIndex]) {
              correct = q.answers[selectedIndex].isCorrect === true;
            } else if (type === 'truefalse') {
              correct = q.correctAnswerBool === trueFalse;
            } else if (type === 'fillblank') {
              const expected = (q.correctAnswer || '').trim();
              correct = fillBlank.trim() === expected;
            }
            const answered = phaserRef.current?.registry?.get('answeredNpcIndices');
            if (answered && questionModal?.npcIndex !== undefined) answered.add(questionModal.npcIndex);

            phaserRef.current?.registry?.set('lastAnswerResult', correct ? 'correct' : 'incorrect');
            phaserRef.current?.registry?.set('lastAnswerResultUntil', Date.now() + 3000);
            setAnswerResultIsCorrect(correct);
            setAnswerResultLabel(correct ? t('common_correct') : t('common_incorrect'));
            playAnswerSoundImmediately(correct ? 'correct' : 'incorrect');

            if (correct) {
              totalCorrectRef.current += 1;
              let points = POINTS_PER_CORRECT;
              latestScoreRef.current = (latestScoreRef.current ?? 0) + points;
              pointsThisGameRef.current = (pointsThisGameRef.current ?? 0) + points;
              setStudentPoints(pointsThisGameRef.current);

              if (!isTeacher && Math.random() < BOOST_CHANCE) {
                setShowBoostChoiceModal(true);
              }

              setQuestionAnswer((prev) => ({ ...prev, result: 'correct', pointsEarned: points, bonus: 0, boostMessage: null }));
              if (sessionId) {
                gameSessionAPI.addScore(sessionId, points)
                  .then((res) => {
                    const gs = res?.gameSession ?? res;
                    if (res?.newScore != null) latestScoreRef.current = res.newScore;
                    if (gs) setSession(gs);
                  })
                  .catch((err) => console.warn('Add score failed:', err));
              }
              handleClose();
            } else {
              consecutiveCorrectRef.current = 0;
              const difficultyKey = (session?.quiz?.difficulty || 'Medium').trim();
              const normalized = difficultyKey.charAt(0).toUpperCase() + difficultyKey.slice(1).toLowerCase();
              const damage = HEALTH_DAMAGE_BY_DIFFICULTY[normalized] ?? HEALTH_DAMAGE_BY_DIFFICULTY.Medium;
              const currentHealth = healthRef.current ?? health;
              let newHealth = Math.max(0, currentHealth - damage);

              if (!isTeacher) {
                const debuffTypes = ['slow', 'crippled', 'reversedControls', 'extraHealth'];
                const debuff = debuffTypes[Math.floor(Math.random() * debuffTypes.length)];
                const game = phaserRef.current;
                if (game?.registry) {
                  if (debuff === 'slow') {
                    game.registry.set('playerSlowDebuffUntil', Date.now() + DEBUFF_SLOW_DURATION_MS);
                    setDebuffLabel('Slow Movement');
                  } else if (debuff === 'crippled') {
                    game.registry.set('playerCrippledUntil', Date.now() + DEBUFF_CRIPPLED_DURATION_MS);
                    setDebuffLabel('Crippled');
                  } else if (debuff === 'reversedControls') {
                    const reversedUntil = Date.now() + DEBUFF_REVERSED_CONTROLS_DURATION_MS;
                    game.registry.set('playerReversedControlsUntil', reversedUntil);
                    setTouchControlsReversedUntil(reversedUntil);
                    setDebuffLabel('Reversed Controls');
                  } else if (debuff === 'extraHealth') {
                    newHealth = Math.max(0, newHealth - DEBUFF_EXTRA_HEALTH_DEDUCT);
                    setDebuffLabel('Extra Deduction of Health');
                  }
                }
              }
              setHealth(newHealth);
              setQuestionAnswer((prev) => ({ ...prev, result: 'incorrect' }));
              healthRef.current = newHealth;
              phaserRef.current?.registry?.get('emitPlayerStateNow')?.();
              if (newHealth <= 0 && !isTeacher) {
                const totalQuestions = phaserRef.current?.registry?.get('quizQuestions')?.length ?? session?.totalQuestionsPerPlayer ?? 0;
                const pointsThisGame = pointsThisGameRef.current ?? 0;
                const correctCount = totalCorrectRef.current ?? 0;
                if (sessionId && !recordFinishCalledRef.current) {
                  recordFinishCalledRef.current = true;
                  const startedAtMs = session?.startedAt ? new Date(session.startedAt).getTime() : null;
                  const timeToFinishSeconds = startedAtMs ? (Date.now() - startedAtMs) / 1000 : 0;
                  gameSessionAPI.recordPlayerFinish(sessionId, {
                    correctCount,
                    timeToFinishSeconds,
                    points: Number(pointsThisGameRef.current ?? 0)
                  }).catch((err) => console.warn('Record finish failed:', err));
                }
                playGameOverSoundOnce(false);
                setGameOverModal({
                  correct: correctCount,
                  total: totalQuestions || 0,
                  points: Number.isFinite(Number(pointsThisGame)) ? Number(pointsThisGame) : 0,
                  health: 0,
                });
                setQuestionModal(null);
              } else {
                handleClose();
              }
            }
            if (sessionId) {
              const answered = phaserRef.current?.registry?.get('answeredNpcIndices');
              const questions = phaserRef.current?.registry?.get('quizQuestions') || [];
              const totalQuestions = questions.length;
              const completedAll = answered && totalQuestions > 0 && answered.size >= totalQuestions;
              const finishData = !isTeacher && completedAll ? {
                correctCount: totalCorrectRef.current ?? 0,
                timeToFinishSeconds: session?.startedAt
                  ? (Date.now() - new Date(session.startedAt).getTime()) / 1000
                  : 0,
                points: Number(pointsThisGameRef.current ?? 0)
              } : undefined;
              gameSessionAPI.recordAnswer(sessionId, { ...finishData, health: healthRef.current ?? HEALTH_MAX }).catch((err) => console.warn('Record answer failed:', err));
            }
          };

          const handleClose = () => {
            phaserRef.current?.registry?.set('playerFrozen', false);
            phaserRef.current?.registry?.set('unfreezeCooldownUntil', Date.now() + 150);
            phaserRef.current?.registry?.set('unfreezeStuckSnapshotDone', false);
            phaserRef.current?.registry?.set('stuckMoveKeys', null);
            setQuestionModal(null);
            setQuestionAnswer({ selectedIndex: null, trueFalse: null, fillBlank: '', result: null, pointsEarned: null, boostMessage: null });
            if (!isTeacher) {
              const answered = phaserRef.current?.registry?.get('answeredNpcIndices');
              const questions = phaserRef.current?.registry?.get('quizQuestions') || [];
              const totalQuestions = questions.length;
              if (answered && totalQuestions > 0 && answered.size >= totalQuestions) {
                const pointsThisGame = pointsThisGameRef.current ?? 0;
                const correctCount = totalCorrectRef.current ?? 0;
                if (sessionId && !recordFinishCalledRef.current) {
                  recordFinishCalledRef.current = true;
                  const startedAtMs = session?.startedAt ? new Date(session.startedAt).getTime() : null;
                  const timeToFinishSeconds = startedAtMs ? (Date.now() - startedAtMs) / 1000 : 0;
                  gameSessionAPI.recordPlayerFinish(sessionId, {
                    correctCount,
                    timeToFinishSeconds,
                    points: Number(pointsThisGameRef.current ?? 0)
                  }).catch((err) => console.warn('Record finish failed:', err));
                }
                playGameOverSoundOnce(true);
                setGameOverModal({ correct: correctCount, total: totalQuestions, points: Number.isFinite(Number(pointsThisGame)) ? Number(pointsThisGame) : 0, health });
              }
            }
          };

          return (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: GAME_MODAL_OVERLAY,
                padding: 24,
              }}
            >
              <div
                style={{
                  background: GAME_MODAL_SURFACE,
                  borderRadius: 12,
                  padding: 24,
                  maxWidth: 480,
                  width: '100%',
                  maxHeight: '85vh',
                  overflowY: 'auto',
                  boxShadow: GAME_MODAL_SHADOW,
                  border: `1px solid ${GAME_MODAL_BORDER}`,
                }}
              >
                <h3 style={{ margin: '0 0 16px', color: GAME_MODAL_TEXT, fontFamily: 'Poppins, sans-serif' }}>
                  {t('gameplay_question')}
                </h3>
                <p style={{ margin: '0 0 16px', color: GAME_MODAL_TEXT, fontSize: '1rem', lineHeight: 1.5 }}>
                  {q.questionText}
                </p>

                {type === 'qanda' && q.answers && (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {q.answers.map((a, idx) => {
                      const isSelected = selectedIndex === idx;
                      const showCorrect = result !== null && a.isCorrect;
                      const showWrong = result !== null && isSelected && !a.isCorrect;
                      const optionText = a.text ?? a.answerText ?? '';
                      return (
                        <li key={idx}>
                          <button
                            type="button"
                            className="game-question-btn"
                            disabled={result !== null}
                            onClick={() => setQuestionAnswer((prev) => ({ ...prev, selectedIndex: idx }))}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '12px 14px',
                              marginBottom: 8,
                              borderRadius: 8,
                              border: `2px solid ${isSelected ? GAME_MODAL_PRIMARY : GAME_MODAL_INPUT_BORDER}`,
                              background: showCorrect ? GAME_MODAL_PRIMARY : showWrong ? GAME_MODAL_SECONDARY : GAME_MODAL_INPUT_BG,
                              color: GAME_MODAL_TEXT,
                              cursor: result === null ? 'pointer' : 'default',
                              fontFamily: 'Poppins, sans-serif',
                              fontSize: '1rem',
                            }}
                          >
                            {optionText}
                            {showCorrect && ' ✓'}
                            {showWrong && ' ✗'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {type === 'truefalse' && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <button
                      type="button"
                      className="game-question-btn"
                      disabled={result !== null}
                      onClick={() => setQuestionAnswer((prev) => ({ ...prev, trueFalse: true }))}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: `2px solid ${trueFalse === true ? GAME_MODAL_PRIMARY : GAME_MODAL_INPUT_BORDER}`,
                        background: result !== null && q.correctAnswerBool === true ? GAME_MODAL_PRIMARY : result !== null && trueFalse === true ? GAME_MODAL_SECONDARY : GAME_MODAL_INPUT_BG,
                        color: GAME_MODAL_TEXT,
                        cursor: result === null ? 'pointer' : 'default',
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 600,
                      }}
                    >
                      {t('gameplay_true')} {result !== null && q.correctAnswerBool === true && ' ✓'}
                    </button>
                    <button
                      type="button"
                      className="game-question-btn"
                      disabled={result !== null}
                      onClick={() => setQuestionAnswer((prev) => ({ ...prev, trueFalse: false }))}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: `2px solid ${trueFalse === false ? GAME_MODAL_PRIMARY : GAME_MODAL_INPUT_BORDER}`,
                        background: result !== null && q.correctAnswerBool === false ? GAME_MODAL_PRIMARY : result !== null && trueFalse === false ? GAME_MODAL_SECONDARY : GAME_MODAL_INPUT_BG,
                        color: GAME_MODAL_TEXT,
                        cursor: result === null ? 'pointer' : 'default',
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 600,
                      }}
                    >
                      {t('gameplay_false')} {result !== null && q.correctAnswerBool === false && ' ✓'}
                    </button>
                  </div>
                )}

                {type === 'fillblank' && (
                  <input
                    ref={(el) => {
                      fillBlankInputRef.current = el;
                      if (el && result === null) setTimeout(() => el.focus(), 0);
                    }}
                    autoFocus
                    type="text"
                    placeholder="Type your answer..."
                    value={fillBlank}
                    disabled={result !== null}
                    onChange={(e) => setQuestionAnswer((prev) => ({ ...prev, fillBlank: e.target.value }))}
                    onKeyDown={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      marginBottom: 16,
                      borderRadius: 8,
                      border: `2px solid ${GAME_MODAL_INPUT_BORDER}`,
                      background: GAME_MODAL_INPUT_BG,
                      color: GAME_MODAL_TEXT,
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                    }}
                  />
                )}

                {result === null && (
                <div style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    className="game-question-submit"
                    disabled={!canSubmit}
                    onClick={handleSubmit}
                    style={{
                      padding: '10px 20px',
                      background: canSubmit ? GAME_MODAL_PRIMARY : 'rgba(255,255,255,0.2)',
                      color: GAME_MODAL_TEXT,
                      border: `1px solid ${GAME_MODAL_BORDER}`,
                      borderRadius: 8,
                      cursor: canSubmit ? 'pointer' : 'not-allowed',
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: 600,
                    }}
                  >
                    {t('gameplay_submit')}
                  </button>
                </div>
                )}
              </div>
            </div>
          );
        })()}

        {!isTeacher && showBoostChoiceModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 105,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: GAME_MODAL_OVERLAY,
              padding: 24,
            }}
          >
            <div
              style={{
                background: GAME_MODAL_SURFACE,
                borderRadius: 16,
                padding: 28,
                maxWidth: 420,
                width: '100%',
                boxShadow: GAME_MODAL_SHADOW,
                border: `1px solid ${GAME_MODAL_BORDER}`,
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              <h2 style={{ margin: '0 0 20px', fontSize: '1.35rem', color: GAME_MODAL_TEXT, fontWeight: 700, textAlign: 'center' }}>
                {t('gameplay_chooseBoost')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(() => {
                  const cd = (key) => (boostCooldownUntil[key] != null && Date.now() < boostCooldownUntil[key])
                    ? Math.max(0, Math.ceil((boostCooldownUntil[key] - Date.now()) / 1000))
                    : 0;
                  return (
                    <>
                <button
                  type="button"
                  className="game-boost-btn"
                  disabled={cd('movementSpeed') > 0}
                  onClick={() => {
                    if (cd('movementSpeed') > 0) return;
                    setBoostCooldownUntil((p) => ({ ...p, movementSpeed: Date.now() + BOOST_COOLDOWN_MS }));
                    phaserRef.current?.registry?.set('playerSpeedBoostUntil', Date.now() + BOOST_SPEED_DURATION_MS);
                    setBoostLabel('Movement Speed');
                    setShowBoostChoiceModal(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    background: GAME_MODAL_SURFACE_ALT,
                    border: `1px solid ${GAME_MODAL_BORDER}`,
                    borderRadius: 10,
                    color: GAME_MODAL_TEXT,
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 600,
                    cursor: cd('movementSpeed') > 0 ? 'not-allowed' : 'pointer',
                    opacity: cd('movementSpeed') > 0 ? 0.6 : 1,
                    textAlign: 'left',
                  }}
                >
                  ⚡ {t('gameplay_boostMovementSpeed')}{cd('movementSpeed') > 0 ? ` — ${t('gameplay_boostCooldown', { n: cd('movementSpeed') })}` : ''}
                </button>
                <button
                  type="button"
                  className="game-boost-btn"
                  disabled={cd('doublePoints') > 0}
                  onClick={() => {
                    if (cd('doublePoints') > 0) return;
                    setBoostCooldownUntil((p) => ({ ...p, doublePoints: Date.now() + BOOST_COOLDOWN_MS }));
                    const current = pointsThisGameRef.current ?? 0;
                    const extra = current;
                    pointsThisGameRef.current = current * 2;
                    setStudentPoints(pointsThisGameRef.current);
                    if (sessionId) gameSessionAPI.addScore(sessionId, extra).catch((err) => console.warn('Add score failed:', err));
                    setBoostLabel('Double Points');
                    setShowBoostChoiceModal(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    background: GAME_MODAL_PRIMARY,
                    border: `1px solid ${GAME_MODAL_BORDER}`,
                    borderRadius: 10,
                    color: GAME_MODAL_TEXT,
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 600,
                    cursor: cd('doublePoints') > 0 ? 'not-allowed' : 'pointer',
                    opacity: cd('doublePoints') > 0 ? 0.6 : 1,
                    textAlign: 'left',
                  }}
                >
                  💰 {t('gameplay_boostDoublePoints')}{cd('doublePoints') > 0 ? ` — ${t('gameplay_boostCooldown', { n: cd('doublePoints') })}` : ''}
                </button>
                <button
                  type="button"
                  className="game-boost-btn"
                  disabled={cd('hint') > 0}
                  onClick={() => {
                    if (cd('hint') > 0) return;
                    setBoostCooldownUntil((p) => ({ ...p, hint: Date.now() + BOOST_COOLDOWN_MS }));
                    const game = phaserRef.current;
                    const answered = game?.registry?.get('answeredNpcIndices');
                    const questions = game?.registry?.get('quizQuestions') || [];
                    const playerCount = game?.registry?.get('playerCount') || 1;
                    const myPlayerIndex = game?.registry?.get('myPlayerIndex') ?? 0;
                    for (let qi = 0; qi < questions.length; qi++) {
                      const npcIdx = qi * playerCount + myPlayerIndex;
                      if (!answered?.has(npcIdx)) {
                        if (game?.registry) {
                          game.registry.set('hintNpcIndex', npcIdx);
                          game.registry.set('hintUntil', Date.now() + BOOST_HINT_DURATION_MS);
                        }
                        break;
                      }
                    }
                    setBoostLabel('Hint');
                    setShowBoostChoiceModal(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    background: GAME_MODAL_SECONDARY,
                    border: `1px solid ${GAME_MODAL_BORDER}`,
                    borderRadius: 10,
                    color: GAME_MODAL_TEXT,
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 600,
                    cursor: cd('hint') > 0 ? 'not-allowed' : 'pointer',
                    opacity: cd('hint') > 0 ? 0.6 : 1,
                    textAlign: 'left',
                  }}
                >
                  🎯 {t('gameplay_boostHint')}{cd('hint') > 0 ? ` — ${t('gameplay_boostCooldown', { n: cd('hint') })}` : ''}
                </button>
                {health < HEALTH_MAX && (
                  <button
                    type="button"
                    className="game-boost-btn"
                    disabled={cd('health') > 0}
                    onClick={() => {
                      if (cd('health') > 0) return;
                      setBoostCooldownUntil((p) => ({ ...p, health: Date.now() + BOOST_COOLDOWN_MS }));
                      setHealth((prev) => {
                        const next = Math.min(HEALTH_MAX, prev + BOOST_HEALTH_RESTORE);
                        healthRef.current = next;
                        return next;
                      });
                      requestAnimationFrame(() => phaserRef.current?.registry?.get('emitPlayerStateNow')?.());
                      if (sessionId) gameSessionAPI.updateHealth(sessionId, healthRef.current).catch((err) => console.warn('Update health failed:', err));
                      setBoostLabel('Health');
                      setShowBoostChoiceModal(false);
                    }}
                    style={{
                      padding: '12px 16px',
                      background: GAME_MODAL_SURFACE_ALT,
                      border: `1px solid ${GAME_MODAL_BORDER}`,
                      borderRadius: 10,
                      color: GAME_MODAL_TEXT,
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: 600,
                      cursor: cd('health') > 0 ? 'not-allowed' : 'pointer',
                      opacity: cd('health') > 0 ? 0.6 : 1,
                      textAlign: 'left',
                    }}
                  >
                    ❤️ {t('gameplay_boostHealth', { n: BOOST_HEALTH_RESTORE })}{cd('health') > 0 ? ` — ${t('gameplay_boostCooldown', { n: cd('health') })}` : ''}
                  </button>
                )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {isTeacher && teacherGameOverModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: GAME_MODAL_OVERLAY,
              padding: 24,
            }}
          >
            <div
              style={{
                background: GAME_MODAL_SURFACE,
                borderRadius: 16,
                padding: 32,
                maxWidth: 400,
                width: '100%',
                textAlign: 'center',
                boxShadow: GAME_MODAL_SHADOW,
                border: `1px solid ${GAME_MODAL_BORDER}`,
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              <h2 style={{ margin: '0 0 28px', fontSize: '1.75rem', color: GAME_MODAL_TEXT, fontWeight: 700 }}>
                {t('common_gameOver')}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setTeacherGameOverModal(false);
                  const rawClass = session?.class ?? location?.state?.classData;
                  const classData = rawClass ? {
                    ...(typeof rawClass === 'object' ? rawClass : {}),
                    id: rawClass._id ?? rawClass.id,
                    _id: rawClass._id ?? rawClass.id,
                  } : null;
                  const root = document.getElementById(GAMEPLAY_ROOT_ID);
                  if (root) root.remove();
                  document.body.classList.remove('gameplay-active');
                  if (!isTeacher && sessionId) {
                    gameSessionAPI.leaveGameSession(sessionId).catch(() => {});
                    leaveGameSession(sessionId);
                  }
                  if (classData && (classData._id || classData.id)) {
                    navigate('/classroom', { state: { classData, activeNav: 'leaderboards', fromGameOver: true }, replace: true });
                  } else if (sessionId) {
                    navigate(`/lobby/${sessionId}`, { state: { gameSession: session, classData }, replace: true });
                  } else {
                    navigate('/my-class', { replace: true });
                  }
                }}
                style={{
                  padding: '14px 28px',
                  background: GAME_MODAL_PRIMARY,
                  color: GAME_MODAL_TEXT,
                  border: `1px solid ${GAME_MODAL_BORDER}`,
                  borderRadius: 10,
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: '0 4px 14px rgba(120, 145, 83, 0.35)',
                }}
              >
                {t('gameplay_viewLeaderboard')}
              </button>
            </div>
          </div>
        )}

        {showGoToLobbyModal && !gameOverModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: GAME_MODAL_OVERLAY,
              padding: 24,
            }}
          >
            <div
              style={{
                background: GAME_MODAL_SURFACE,
                borderRadius: 16,
                padding: 32,
                maxWidth: 400,
                width: '100%',
                textAlign: 'center',
                boxShadow: GAME_MODAL_SHADOW,
                border: `1px solid ${GAME_MODAL_BORDER}`,
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              <h2 style={{ margin: '0 0 24px', fontSize: '1.75rem', color: GAME_MODAL_TEXT, fontWeight: 700 }}>
                Game ended
              </h2>
              <p style={{ margin: '0 0 28px', fontSize: '1.125rem', color: GAME_MODAL_TEXT }}>
                {isTeacher ? 'You have ended the game.' : 'The teacher has ended the game.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowGoToLobbyModal(false);
                  if (isTeacher && !teacherStoppedGameRef.current) {
                    if (sessionId) leaveGameSession(sessionId);
                    if (session?.class) {
                      const c = session.class;
                      const cData = { id: c._id ?? c.id, subject: c.subject, gradeLevel: c.gradeLevel, section: c.section, classCode: c.classCode, teacher: c.teacher, teacherName: c.teacher ? `${c.teacher.firstName || ''} ${c.teacher.lastName || ''}`.trim() : '' };
                      navigate('/classroom', { state: { classData: cData, activeNav: 'game' }, replace: true });
                    } else {
                      navigate('/my-class', { replace: true });
                    }
                  } else {
                    navigate(`/lobby/${sessionId}`, { state: { gameSession: session }, replace: true });
                  }
                }}
                style={{
                  padding: '14px 28px',
                  background: GAME_MODAL_PRIMARY,
                  color: GAME_MODAL_TEXT,
                  border: `1px solid ${GAME_MODAL_BORDER}`,
                  borderRadius: 10,
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: '0 4px 14px rgba(120, 145, 83, 0.35)',
                }}
              >
                {isTeacher && !teacherStoppedGameRef.current ? 'Return to Classroom' : 'Go to Lobby'}
              </button>
            </div>
          </div>
        )}

        {!isTeacher && gameOverModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: GAME_MODAL_OVERLAY,
              padding: 24,
            }}
          >
            <div
              style={{
                background: GAME_MODAL_SURFACE,
                borderRadius: 16,
                padding: 32,
                maxWidth: 400,
                width: '100%',
                textAlign: 'center',
                boxShadow: GAME_MODAL_SHADOW,
                border: `1px solid ${GAME_MODAL_BORDER}`,
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              <h2 style={{ margin: '0 0 24px', fontSize: '1.75rem', color: GAME_MODAL_TEXT, fontWeight: 700 }}>
                {t('common_gameOver')}
              </h2>
              <p style={{ margin: '0 0 8px', fontSize: '1.25rem', color: GAME_MODAL_TEXT }}>
                {t('gameplay_correctAnswersCount')}: <strong style={{ color: GAME_MODAL_TEXT }}>{gameOverModal.correct}/{gameOverModal.total}</strong>
              </p>
              <p style={{ margin: '0 0 8px', fontSize: '1.25rem', color: GAME_MODAL_TEXT }}>
                {t('gameplay_healthLabel')}: <strong style={{ color: GAME_MODAL_TEXT }}>{(gameOverModal.health ?? health ?? 0)}/{HEALTH_MAX}</strong>
              </p>
              <p style={{ margin: '0 0 28px', fontSize: '1.25rem', color: GAME_MODAL_TEXT }}>
                {t('gameplay_totalPoints')}: <strong style={{ color: GAME_MODAL_TEXT }}>{gameOverModal.points}</strong>
              </p>
              <button
                type="button"
                onClick={() => {
                  const classData = session?.class;
                  if (classData && (classData._id || classData.id)) {
                    const root = document.getElementById(GAMEPLAY_ROOT_ID);
                    if (root) root.remove();
                    document.body.classList.remove('gameplay-active');
                    if (sessionId) {
                      gameSessionAPI.leaveGameSession(sessionId).catch(() => {});
                      leaveGameSession(sessionId);
                    }
                    navigate('/classroom', { state: { classData, activeNav: 'leaderboards', fromGameOver: true }, replace: true });
                  } else {
                    const root = document.getElementById(GAMEPLAY_ROOT_ID);
                    if (root) root.remove();
                    document.body.classList.remove('gameplay-active');
                    if (sessionId) {
                      gameSessionAPI.leaveGameSession(sessionId).catch(() => {});
                      leaveGameSession(sessionId);
                    }
                    navigate('/my-class', { replace: true });
                  }
                }}
                style={{
                  padding: '14px 28px',
                  background: GAME_MODAL_PRIMARY,
                  color: GAME_MODAL_TEXT,
                  border: `1px solid ${GAME_MODAL_BORDER}`,
                  borderRadius: 10,
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: '0 4px 14px rgba(120, 145, 83, 0.35)',
                }}
              >
                {t('gameplay_viewLeaderboard')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return portalReady
    ? createPortal(content, portalRootRef.current)
    : null;
};

export default Gameplay;