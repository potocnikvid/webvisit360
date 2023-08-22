import { ReactNode } from "react";
import Image from "next/image";

export default function Timeline() {
  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent md:before:mx-auto md:before:translate-x-0">
      <div className="is-active group relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
        <div className="w-[calc(100%-4rem)] rounded border border-slate-200 bg-white p-4 shadow md:w-[calc(50%-2.5rem)]">
          <div className="mb-1 flex items-center justify-between space-x-2">
            <div className="font-bold text-slate-900">Order Placed</div>
            <time className="font-caveat font-medium text-indigo-500">
              08/06/2023
            </time>
          </div>
          <div className="text-slate-500">
            Pretium lectus quam id leo. Urna et pharetra aliquam vestibulum
            morbi blandit cursus risus.
          </div>
        </div>
      </div>

      <div className="is-active group relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
        <div className="w-[calc(100%-4rem)] rounded border border-slate-200 bg-white p-4 shadow md:w-[calc(50%-2.5rem)]">
          <div className="mb-1 flex items-center justify-between space-x-2">
            <div className="font-bold text-slate-900">Order Shipped</div>
            <time className="font-caveat font-medium text-indigo-500">
              09/06/2023
            </time>
          </div>
          <div className="text-slate-500">
            Pretium lectus quam id leo. Urna et pharetra aliquam vestibulum
            morbi blandit cursus risus.
          </div>
        </div>
      </div>

      <div className="is-active group relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
        <div className="w-[calc(100%-4rem)] rounded border border-slate-200 bg-white p-4 shadow md:w-[calc(50%-2.5rem)]">
          <div className="mb-1 flex items-center justify-between space-x-2">
            <div className="font-bold text-slate-900">In Transit</div>
            <time className="font-caveat font-medium text-indigo-500">
              10/06/2023
            </time>
          </div>
          <Image src="/logo.png" alt="webvisit360" width={50} height={50} />
          <div className="text-slate-500">
            Pretium lectus quam id leo. Urna et pharetra aliquam vestibulum
            morbi blandit cursus risus.
          </div>
        </div>
      </div>

      <div className="is-active group relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
        <div className="w-[calc(100%-4rem)] rounded border border-slate-200 bg-white p-4 shadow md:w-[calc(50%-2.5rem)]">
          <div className="mb-1 flex items-center justify-between space-x-2">
            <div className="font-bold text-slate-900">Out of Delivery</div>
            <time className="font-caveat font-medium text-indigo-500">
              12/06/2023
            </time>
          </div>
          <div className="text-slate-500">
            Pretium lectus quam id leo. Urna et pharetra aliquam vestibulum
            morbi blandit cursus risus.
          </div>
        </div>
      </div>

      <div className="group relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
        <div className="w-[calc(100%-4rem)] rounded border border-slate-200 bg-white p-4 shadow md:w-[calc(50%-2.5rem)]">
          <div className="mb-1 flex items-center justify-between space-x-2">
            <div className="font-bold text-slate-900">Delivered</div>
            <time className="font-caveat font-medium text-amber-500">
              Exp. 12/08/2023
            </time>
          </div>
          <div className="text-slate-500">
            Pretium lectus quam id leo. Urna et pharetra aliquam vestibulum
            morbi blandit cursus risus.
          </div>
        </div>
      </div>
    </div>
  );
}
