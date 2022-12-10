export interface Coord {
  lon: number;
  lat: number;
}

export interface City {
  id: number;
  name: string;
  coord: Coord;
  country: string;
  population: number;
  timezone: number;
}

export interface Temp {
  day: number;
  min: number;
  max: number;
  night: number;
  eve: number;
  morn: number;
}

export interface FeelsLike {
  day: number;
  night: number;
  eve: number;
  morn: number;
}

export interface Weather {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface List {
  dt: number;
  sunrise: number;
  sunset: number;
  temp: Temp;
  feels_like: FeelsLike;
  pressure: number;
  humidity: number;
  weather: Weather[];
  speed: number;
  deg: number;
  gust: number;
  clouds: number;
  pop: number;
}

export interface WeeklyForecastResponse {
  city: City;
  cod: string;
  message: number;
  cnt: number;
  list: List[];
}

export interface LocalNames {
  af: string;
  ar: string;
  ascii: string;
  az: string;
  bg: string;
  ca: string;
  da: string;
  de: string;
  el: string;
  en: string;
  eu: string;
  fa: string;
  feature_name: string;
  fi: string;
  fr: string;
  gl: string;
  he: string;
  hi: string;
  hr: string;
  hu: string;
  id: string;
  it: string;
  ja: string;
  la: string;
  lt: string;
  mk: string;
  nl: string;
  no: string;
  pl: string;
  pt: string;
  ro: string;
  ru: string;
  sk: string;
  sl: string;
  sr: string;
  th: string;
  tr: string;
  vi: string;
  zu: string;
}

export interface GeocodeResponse {
  name: string;
  local_names: LocalNames;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export interface ForecastResponse {
  city: City;
  list: {
    dt: number;
    weather: { description: string }[];
    main: { humidity: string; temp: string };
  }[];
}

export interface WeatherResponse {
  cod?: string;
  coord: Coord;
  wind: {
    deg: number;
    speed: string;
  };
  name: string;
  main: {
    temp: string;
    humidity: string;
  };
  weather: {
    description: string;
  }[];
  sys: {
    country: string;
  };
}

export interface Category {
  Number: number;
  Name: string;
}

export interface AirQualityForecastResponse extends Array<AirQualityForecast> {}
export interface AirQualityCurrentResponse extends Array<AirQualityResponse> {}
export interface AirQualityForecast {
  DateIssue: string;
  DateForecast: string;
  ReportingArea: string;
  StateCode: string;
  Latitude: number;
  Longitude: number;
  ParameterName: string;
  AQI: number;
  Category: Category;
  ActionDay: boolean;
  Discussion: string;
}

export interface AirQualityResponse {
  DateObserved: string;
  HourObserved: number;
  LocalTimeZone: string;
  ReportingArea: string;
  StateCode: string;
  Latitude: number;
  Longitude: number;
  ParameterName: string;
  AQI: number;
  Category: Category;
}
