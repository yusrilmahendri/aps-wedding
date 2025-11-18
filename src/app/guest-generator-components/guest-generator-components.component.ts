import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import Swal from 'sweetalert2';

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
    // 🔥 Base URL otomatis jika kosong
    const base: string =
      this.form.value.baseUrl?.trim() ||
      'https://pio-wedding.pioneersolve.id/wedding/Nova&Yusril';

    const rawNames: string = this.form.value.names?.trim();

    if (!rawNames) {
      Swal.fire('Oops', 'Nama tamu tidak boleh kosong', 'warning');
      return;
    }

    const lines: string[] = rawNames
      .split('\n')
      .map((v: string) => v.trim())
      .filter((v: string) => v !== '');

    this.guests = [];

    lines.forEach((line: string) => {
      this.guests.push({
        name: line,
        link: `${base}?guest=${encodeURIComponent(line)}`,
        message: this.buildMessage(line, base)
      });
    });

    Swal.fire('Berhasil', 'Daftar tamu berhasil ditambahkan!', 'success');
  }

  buildMessage(name: string, baseUrl: string) {
    const link = `${baseUrl}?guest=${encodeURIComponent(name)}`;
    return `Kepada Yth.
      Bapak/Ibu/Saudara/i ${name}
      ─────────

      Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i, teman sekaligus sahabat, untuk menghadiri acara pernikahan kami.

      Berikut link undangan kami, untuk info lengkap dari acara, bisa kunjungi :

      ${link}

      Merupakan suatu kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan untuk hadir dan memberikan doa restu.

      Terima Kasih

      Hormat kami,
      Nova & Yusril
      ─────────`;
  }

  copy(text: string, isMessage: boolean = true) {
    navigator.clipboard.writeText(text).then(() => {
      if (isMessage) {
        Swal.fire('Berhasil', 'Pesan berhasil dicopy!', 'success');
      } else {
        Swal.fire('Berhasil', 'Link berhasil dicopy!', 'success');
      }
    });
  }

  deleteGuest(index: number) {
    Swal.fire({
      title: 'Yakin?',
      text: `Apakah Anda yakin ingin menghapus tamu "${this.guests[index].name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        this.guests.splice(index, 1);
        Swal.fire('Terhapus!', 'Tamu berhasil dihapus.', 'success');
      }
    });
  }

  deleteAll() {
    Swal.fire({
      title: 'Yakin?',
      text: 'Apakah Anda yakin ingin menghapus semua daftar tamu?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus semua',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        this.guests = [];
        Swal.fire('Terhapus!', 'Semua daftar tamu berhasil dihapus.', 'success');
      }
    });
  }

  whatsapp(link: string, text: string) {
    const url = `https://wa.me/?text=${encodeURIComponent(text + '\n')}`;
    window.open(url, '_blank');
  }
}