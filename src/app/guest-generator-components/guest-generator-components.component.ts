import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface Guest {
  name: string;
  link: string;
}

@Component({
  selector: 'wc-guest-generator-components',
  templateUrl: './guest-generator-components.component.html',
  styleUrls: ['./guest-generator-components.component.scss']
})
export class GuestGeneratorComponentsComponent implements OnInit {
 form!: FormGroup;
  guests: any[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      baseUrl: [''],
      names: ['']
    });
  }

  generateGuests() {
    const base = this.form.value.baseUrl?.trim();
    const rawNames = this.form.value.names?.trim();
    console.log('Generating guests with base URL:', base);
    console.log('Raw names input:', rawNames);

    if (!base || !rawNames) return;

    const lines = rawNames
      .split('\n')
      .map((v: string) => v.trim())
      .filter((v: string) => v !== '');

    this.guests = lines.map((name: string) => ({
      name,
      link: `${base}?guest=${encodeURIComponent(name)}`,
      message: this.buildMessage(name, base)
    }));
  }

  buildMessage(name: string, baseUrl: string) {
    const link = `${baseUrl}?guest=${encodeURIComponent(name)}`;

    return (
  `Kepada Yth.
  Bapak/Ibu/Saudara/i
  ${name}
  ─────────

  Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i, teman sekaligus sahabat, untuk menghadiri acara pernikahan kami.

  Berikut link undangan kami, untuk info lengkap dari acara, bisa kunjungi :

  ${link}

  Merupakan suatu kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan untuk hadir dan memberikan doa restu.

  Terima Kasih

  Hormat kami,
  Nova & Yusril
  ─────────`
    );
  }

  copy(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  }

  deleteGuest(index: number) {
    this.guests.splice(index, 1);
  }

  deleteAll() {
    this.guests = [];
  }

  whatsapp(link: string, text: string) {
    const url = `https://wa.me/?text=${encodeURIComponent(text + '\n')}`;
    window.open(url, '_blank');
  }
}
