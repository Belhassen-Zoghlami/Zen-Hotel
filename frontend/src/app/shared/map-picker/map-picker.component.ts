import { Component, inject, AfterViewInit, ViewChild, ElementRef, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import L from 'leaflet';

@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map-picker.component.html',
  styleUrls: ['./map-picker.component.scss']
})
export class MapPickerComponent implements AfterViewInit {
  @ViewChild('map') mapContainer!: ElementRef;
  @Output() locationSelected = new EventEmitter<{ latitude: number; longitude: number; address: string }>();
  @Input() initialCoordinates?: { latitude: number; longitude: number };
  @Input() initialAddress?: string;

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  
  searchQuery: string = '';
  currentAddress: string = '';
  selectedCoordinates: { latitude: number; longitude: number } | null = null;

  ngAfterViewInit() {
    this.initializeMap();
  }

  initializeMap() {
    // Default center (can be changed to user's location or a default city)
    const defaultLat = this.initialCoordinates?.latitude || 33.8869; // Default to Tunisia
    const defaultLng = this.initialCoordinates?.longitude || 9.5375;

    this.map = L.map(this.mapContainer.nativeElement).setView([defaultLat, defaultLng], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Add click handler
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.onMapClick(e);
    });

    // If initial coordinates provided, set marker
    if (this.initialCoordinates) {
      this.setMarker(this.initialCoordinates.latitude, this.initialCoordinates.longitude);
      if (this.initialAddress) {
        this.currentAddress = this.initialAddress;
      }
    }
  }

  onMapClick(event: L.LeafletMouseEvent) {
    const { lat, lng } = event.latlng;
    this.setMarker(lat, lng);
    this.reverseGeocode(lat, lng);
  }

  setMarker(lat: number, lng: number) {
    // Remove existing marker
    if (this.marker) {
      this.map?.removeLayer(this.marker);
    }

    // Create custom icon
    const customIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Add new marker
    this.marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map!);
    
    // Update selected coordinates
    this.selectedCoordinates = { latitude: lat, longitude: lng };
    
    // Emit event
    this.emitLocation();
  }

  async searchLocation() {
    if (!this.searchQuery.trim()) return;

    try {
      // Using Nominatim (OpenStreetMap) geocoding API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        // Center map on location
        this.map?.setView([latitude, longitude], 15);
        
        // Set marker
        this.setMarker(latitude, longitude);
        
        // Update address
        this.currentAddress = display_name;
        this.searchQuery = '';
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Failed to search for location. Please try again.');
    }
  }

  async reverseGeocode(lat: number, lng: number) {
    try {
      // Using Nominatim reverse geocoding API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();

      if (data && data.display_name) {
        this.currentAddress = data.display_name;
        this.emitLocation();
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  }

  emitLocation() {
    if (this.selectedCoordinates) {
      this.locationSelected.emit({
        latitude: this.selectedCoordinates.latitude,
        longitude: this.selectedCoordinates.longitude,
        address: this.currentAddress
      });
    }
  }

  getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.map?.setView([latitude, longitude], 15);
          this.setMarker(latitude, longitude);
          this.reverseGeocode(latitude, longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your current location.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  }

  clearSelection() {
    if (this.marker) {
      this.map?.removeLayer(this.marker);
      this.marker = null;
    }
    this.selectedCoordinates = null;
    this.currentAddress = '';
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}
