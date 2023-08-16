export interface Game {
  game_id: string;
  owner_id: string;
  is_end: boolean;
  prize_pool_amount: number;
  player_one: PlayerData;
  player_two: PlayerData;
  expiration_timestamp_in_seconds: number;
}

export interface PlayerData {
  play_address: string;
  decision_hash: [];
  salt_hash: [];
  decision: number;
}
