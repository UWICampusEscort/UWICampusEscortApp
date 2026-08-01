import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "UWI Campus Escort";
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    display: "flex",
                    width: "100%",
                    height: "100%",
                    background:
                        "linear-gradient(135deg, #003C71 0%, #0056A3 100%)",
                    color: "white",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    fontFamily: "sans-serif",
                    padding: "80px",
                }}
            >
                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 700,
                        marginBottom: 20,
                    }}
                >
                    UWI Campus Escort
                </div>

                <div
                    style={{
                        fontSize: 34,
                        opacity: 0.9,
                        textAlign: "center",
                        maxWidth: 900,
                    }}
                >
                    Safe, Reliable Campus Transportation
                </div>

                <div
                    style={{
                        marginTop: 50,
                        fontSize: 24,
                        opacity: 0.8,
                    }}
                >
                    The University of the West Indies
                </div>
            </div>
        ),
        size
    );
}