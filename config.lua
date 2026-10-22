Config = {}

-- ── Commands ──────────────────────────────────────────────────────────────
Config.OpenCommand   = 'carplay'         -- opens the player (must be inside a vehicle)
Config.VolumeCommand = 'carplayvolume'   -- /carplayvolume 0-1 : YOUR personal master volume

-- ── Who can use it ────────────────────────────────────────────────────────
Config.DriverOnly        = false   -- true = only the driver seat can open/control the player
Config.RequireEngineOn   = false   -- true = player only works while the engine is running
Config.StopWhenEmpty     = false   -- true = music stops when everyone leaves the vehicle

-- ── Audio / performance ───────────────────────────────────────────────────
Config.HearDistance      = 35.0    -- metres outside the car where the music can be heard
Config.MaxOtherCars      = 2       -- max OTHER vehicles a player will play audio for at once (keeps CPU low)
Config.DefaultCarVolume  = 0.6     -- starting volume of a vehicle's player (0-1)
Config.DefaultMasterVol  = 1.0     -- starting personal master volume (/carplayvolume)
Config.OutsideMuffle     = 0.55    -- volume multiplier when listener is outside the car (windows/body)
Config.TickIdle          = 1500    -- ms between checks when no music is playing nearby
Config.TickActive        = 300     -- ms between checks while music is nearby
Config.DriftTolerance    = 3.0     -- seconds of drift allowed before a listener re-syncs

-- ── Library limits (saved per character) ──────────────────────────────────
Config.MaxSavedTracks      = 300
Config.MaxPlaylists        = 20
Config.MaxPlaylistTracks   = 100
Config.MaxQueue            = 100

-- ── Link resolving (server side, no API keys) ─────────────────────────────
Config.SearchResults     = 6       -- results shown for a text search
Config.HttpTimeoutNote   = 'Server needs outbound HTTPS to youtube.com'

-- ── Misc ──────────────────────────────────────────────────────────────────
Config.Debug = false
