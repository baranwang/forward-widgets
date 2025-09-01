import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace biliproto. */
export namespace biliproto {

    /** Namespace community. */
    namespace community {

        /** Namespace service. */
        namespace service {

            /** Namespace dm. */
            namespace dm {

                /** Namespace v1. */
                namespace v1 {

                    /** Properties of a DanmakuElem. */
                    interface IDanmakuElem {

                        /** DanmakuElem id */
                        id?: (number|Long|null);

                        /** DanmakuElem progress */
                        progress?: (number|null);

                        /** DanmakuElem mode */
                        mode?: (number|null);

                        /** DanmakuElem fontsize */
                        fontsize?: (number|null);

                        /** DanmakuElem color */
                        color?: (number|null);

                        /** DanmakuElem midHash */
                        midHash?: (string|null);

                        /** DanmakuElem content */
                        content?: (string|null);

                        /** DanmakuElem ctime */
                        ctime?: (number|Long|null);

                        /** DanmakuElem weight */
                        weight?: (number|null);

                        /** DanmakuElem action */
                        action?: (string|null);

                        /** DanmakuElem pool */
                        pool?: (number|null);

                        /** DanmakuElem idStr */
                        idStr?: (string|null);

                        /** DanmakuElem attr */
                        attr?: (number|null);

                        /** DanmakuElem animation */
                        animation?: (string|null);

                        /** DanmakuElem likeNum */
                        likeNum?: (number|null);

                        /** DanmakuElem colorV2 */
                        colorV2?: (string|null);

                        /** DanmakuElem dmTypeV2 */
                        dmTypeV2?: (number|null);
                    }

                    /** Represents a DanmakuElem. */
                    class DanmakuElem implements IDanmakuElem {

                        /**
                         * Constructs a new DanmakuElem.
                         * @param [properties] Properties to set
                         */
                        constructor(properties?: biliproto.community.service.dm.v1.IDanmakuElem);

                        /** DanmakuElem id. */
                        public id: (number|Long);

                        /** DanmakuElem progress. */
                        public progress: number;

                        /** DanmakuElem mode. */
                        public mode: number;

                        /** DanmakuElem fontsize. */
                        public fontsize: number;

                        /** DanmakuElem color. */
                        public color: number;

                        /** DanmakuElem midHash. */
                        public midHash: string;

                        /** DanmakuElem content. */
                        public content: string;

                        /** DanmakuElem ctime. */
                        public ctime: (number|Long);

                        /** DanmakuElem weight. */
                        public weight: number;

                        /** DanmakuElem action. */
                        public action: string;

                        /** DanmakuElem pool. */
                        public pool: number;

                        /** DanmakuElem idStr. */
                        public idStr: string;

                        /** DanmakuElem attr. */
                        public attr: number;

                        /** DanmakuElem animation. */
                        public animation: string;

                        /** DanmakuElem likeNum. */
                        public likeNum: number;

                        /** DanmakuElem colorV2. */
                        public colorV2: string;

                        /** DanmakuElem dmTypeV2. */
                        public dmTypeV2: number;

                        /**
                         * Creates a new DanmakuElem instance using the specified properties.
                         * @param [properties] Properties to set
                         * @returns DanmakuElem instance
                         */
                        public static create(properties?: biliproto.community.service.dm.v1.IDanmakuElem): biliproto.community.service.dm.v1.DanmakuElem;

                        /**
                         * Encodes the specified DanmakuElem message. Does not implicitly {@link biliproto.community.service.dm.v1.DanmakuElem.verify|verify} messages.
                         * @param message DanmakuElem message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encode(message: biliproto.community.service.dm.v1.IDanmakuElem, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Encodes the specified DanmakuElem message, length delimited. Does not implicitly {@link biliproto.community.service.dm.v1.DanmakuElem.verify|verify} messages.
                         * @param message DanmakuElem message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encodeDelimited(message: biliproto.community.service.dm.v1.IDanmakuElem, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Decodes a DanmakuElem message from the specified reader or buffer.
                         * @param reader Reader or buffer to decode from
                         * @param [length] Message length if known beforehand
                         * @returns DanmakuElem
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): biliproto.community.service.dm.v1.DanmakuElem;

                        /**
                         * Decodes a DanmakuElem message from the specified reader or buffer, length delimited.
                         * @param reader Reader or buffer to decode from
                         * @returns DanmakuElem
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): biliproto.community.service.dm.v1.DanmakuElem;

                        /**
                         * Verifies a DanmakuElem message.
                         * @param message Plain object to verify
                         * @returns `null` if valid, otherwise the reason why it is not
                         */
                        public static verify(message: { [k: string]: any }): (string|null);

                        /**
                         * Creates a DanmakuElem message from a plain object. Also converts values to their respective internal types.
                         * @param object Plain object
                         * @returns DanmakuElem
                         */
                        public static fromObject(object: { [k: string]: any }): biliproto.community.service.dm.v1.DanmakuElem;

                        /**
                         * Creates a plain object from a DanmakuElem message. Also converts values to other types if specified.
                         * @param message DanmakuElem
                         * @param [options] Conversion options
                         * @returns Plain object
                         */
                        public static toObject(message: biliproto.community.service.dm.v1.DanmakuElem, options?: $protobuf.IConversionOptions): { [k: string]: any };

                        /**
                         * Converts this DanmakuElem to JSON.
                         * @returns JSON object
                         */
                        public toJSON(): { [k: string]: any };

                        /**
                         * Gets the default type url for DanmakuElem
                         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns The default type url
                         */
                        public static getTypeUrl(typeUrlPrefix?: string): string;
                    }

                    /** Properties of a Flag. */
                    interface IFlag {

                        /** Flag value */
                        value?: (number|null);

                        /** Flag description */
                        description?: (string|null);
                    }

                    /** Represents a Flag. */
                    class Flag implements IFlag {

                        /**
                         * Constructs a new Flag.
                         * @param [properties] Properties to set
                         */
                        constructor(properties?: biliproto.community.service.dm.v1.IFlag);

                        /** Flag value. */
                        public value: number;

                        /** Flag description. */
                        public description: string;

                        /**
                         * Creates a new Flag instance using the specified properties.
                         * @param [properties] Properties to set
                         * @returns Flag instance
                         */
                        public static create(properties?: biliproto.community.service.dm.v1.IFlag): biliproto.community.service.dm.v1.Flag;

                        /**
                         * Encodes the specified Flag message. Does not implicitly {@link biliproto.community.service.dm.v1.Flag.verify|verify} messages.
                         * @param message Flag message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encode(message: biliproto.community.service.dm.v1.IFlag, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Encodes the specified Flag message, length delimited. Does not implicitly {@link biliproto.community.service.dm.v1.Flag.verify|verify} messages.
                         * @param message Flag message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encodeDelimited(message: biliproto.community.service.dm.v1.IFlag, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Decodes a Flag message from the specified reader or buffer.
                         * @param reader Reader or buffer to decode from
                         * @param [length] Message length if known beforehand
                         * @returns Flag
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): biliproto.community.service.dm.v1.Flag;

                        /**
                         * Decodes a Flag message from the specified reader or buffer, length delimited.
                         * @param reader Reader or buffer to decode from
                         * @returns Flag
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): biliproto.community.service.dm.v1.Flag;

                        /**
                         * Verifies a Flag message.
                         * @param message Plain object to verify
                         * @returns `null` if valid, otherwise the reason why it is not
                         */
                        public static verify(message: { [k: string]: any }): (string|null);

                        /**
                         * Creates a Flag message from a plain object. Also converts values to their respective internal types.
                         * @param object Plain object
                         * @returns Flag
                         */
                        public static fromObject(object: { [k: string]: any }): biliproto.community.service.dm.v1.Flag;

                        /**
                         * Creates a plain object from a Flag message. Also converts values to other types if specified.
                         * @param message Flag
                         * @param [options] Conversion options
                         * @returns Plain object
                         */
                        public static toObject(message: biliproto.community.service.dm.v1.Flag, options?: $protobuf.IConversionOptions): { [k: string]: any };

                        /**
                         * Converts this Flag to JSON.
                         * @returns JSON object
                         */
                        public toJSON(): { [k: string]: any };

                        /**
                         * Gets the default type url for Flag
                         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns The default type url
                         */
                        public static getTypeUrl(typeUrlPrefix?: string): string;
                    }

                    /** Properties of a DmSegMobileReply. */
                    interface IDmSegMobileReply {

                        /** DmSegMobileReply elems */
                        elems?: (biliproto.community.service.dm.v1.IDanmakuElem[]|null);

                        /** DmSegMobileReply state */
                        state?: (number|null);

                        /** DmSegMobileReply aiFlagForSummary */
                        aiFlagForSummary?: (biliproto.community.service.dm.v1.IFlag|null);
                    }

                    /** Represents a DmSegMobileReply. */
                    class DmSegMobileReply implements IDmSegMobileReply {

                        /**
                         * Constructs a new DmSegMobileReply.
                         * @param [properties] Properties to set
                         */
                        constructor(properties?: biliproto.community.service.dm.v1.IDmSegMobileReply);

                        /** DmSegMobileReply elems. */
                        public elems: biliproto.community.service.dm.v1.IDanmakuElem[];

                        /** DmSegMobileReply state. */
                        public state: number;

                        /** DmSegMobileReply aiFlagForSummary. */
                        public aiFlagForSummary?: (biliproto.community.service.dm.v1.IFlag|null);

                        /**
                         * Creates a new DmSegMobileReply instance using the specified properties.
                         * @param [properties] Properties to set
                         * @returns DmSegMobileReply instance
                         */
                        public static create(properties?: biliproto.community.service.dm.v1.IDmSegMobileReply): biliproto.community.service.dm.v1.DmSegMobileReply;

                        /**
                         * Encodes the specified DmSegMobileReply message. Does not implicitly {@link biliproto.community.service.dm.v1.DmSegMobileReply.verify|verify} messages.
                         * @param message DmSegMobileReply message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encode(message: biliproto.community.service.dm.v1.IDmSegMobileReply, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Encodes the specified DmSegMobileReply message, length delimited. Does not implicitly {@link biliproto.community.service.dm.v1.DmSegMobileReply.verify|verify} messages.
                         * @param message DmSegMobileReply message or plain object to encode
                         * @param [writer] Writer to encode to
                         * @returns Writer
                         */
                        public static encodeDelimited(message: biliproto.community.service.dm.v1.IDmSegMobileReply, writer?: $protobuf.Writer): $protobuf.Writer;

                        /**
                         * Decodes a DmSegMobileReply message from the specified reader or buffer.
                         * @param reader Reader or buffer to decode from
                         * @param [length] Message length if known beforehand
                         * @returns DmSegMobileReply
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): biliproto.community.service.dm.v1.DmSegMobileReply;

                        /**
                         * Decodes a DmSegMobileReply message from the specified reader or buffer, length delimited.
                         * @param reader Reader or buffer to decode from
                         * @returns DmSegMobileReply
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): biliproto.community.service.dm.v1.DmSegMobileReply;

                        /**
                         * Verifies a DmSegMobileReply message.
                         * @param message Plain object to verify
                         * @returns `null` if valid, otherwise the reason why it is not
                         */
                        public static verify(message: { [k: string]: any }): (string|null);

                        /**
                         * Creates a DmSegMobileReply message from a plain object. Also converts values to their respective internal types.
                         * @param object Plain object
                         * @returns DmSegMobileReply
                         */
                        public static fromObject(object: { [k: string]: any }): biliproto.community.service.dm.v1.DmSegMobileReply;

                        /**
                         * Creates a plain object from a DmSegMobileReply message. Also converts values to other types if specified.
                         * @param message DmSegMobileReply
                         * @param [options] Conversion options
                         * @returns Plain object
                         */
                        public static toObject(message: biliproto.community.service.dm.v1.DmSegMobileReply, options?: $protobuf.IConversionOptions): { [k: string]: any };

                        /**
                         * Converts this DmSegMobileReply to JSON.
                         * @returns JSON object
                         */
                        public toJSON(): { [k: string]: any };

                        /**
                         * Gets the default type url for DmSegMobileReply
                         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns The default type url
                         */
                        public static getTypeUrl(typeUrlPrefix?: string): string;
                    }
                }
            }
        }
    }
}
