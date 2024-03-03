type PlayerBasicInfo = { username: string, uuid: string }

type PlayerLiteInfo = PlayerBasicInfo & { macAddress: string }

type PlayerPlayInfo = PlayerBasicInfo & { packName: string }

type PlayerFullInfo = PlayerLiteInfo & { ip: string, packName: string }

type PlayerUpdateInfo = PlayerLiteInfo & { ip: string, packName?: string }

type PlayerGetKeyInfo = PlayerLiteInfo & { packName: string }

type PlayerSetKeyInfo = PlayerFullInfo & { key: string }

type PlayerViewInfo = PlayerFullInfo & { path: string }
