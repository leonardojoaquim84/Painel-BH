export type DestinationAirport = 'GIG' | 'SDU' | 'OTHER';

export interface FlightItem {
  id: string;
  companyName: string;
  companyLogoUrl?: string;
  flight: string;
  status: string;
  destination: string;
  destinationCode: DestinationAirport;
  destinationCity: string;
  scheduled: string;
  estimated: string;
  scheduledUnformated: string;
  departureTimestamp: number;
  gate: string;
  terminal?: string;
  flightDate?: string;
  dateLabel?: string;
}

export interface DollarQuote {
  rate: string;
  numericRate: number;
  source: string;
  updatedAt: string;
  variation: string;
}

export interface FlightsResponse {
  success: boolean;
  data: FlightItem[];
  totalFlightsForRio: number;
  totalAirportFlights: number;
  source: string;
  fetchedAt: string;
}

export interface DollarResponse {
  success: boolean;
  data: DollarQuote;
}

export interface AirportWeather {
  code: 'CNF' | 'GIG' | 'SDU';
  icao: 'SBCF' | 'SBGL' | 'SBRJ';
  name: string;
  city: string;
  metar: string;
  fltCat?: string;
  temperature: number;
  windSpeed: number;
  windDir?: number;
  altimeter?: number;
  condition: string;
  isGoodForFlight: boolean;
  updatedAt: string;
}

export interface WeatherResponse {
  success: boolean;
  data: AirportWeather[];
}

export interface FlightStatusAlert {
  id: string;
  flightId: string;
  flightNumber: string;
  company: string;
  previousStatus: string;
  newStatus: string;
  changeTime: string;
  changeDate: string;
  destination: string;
  gate: string;
  unread: boolean;
}

