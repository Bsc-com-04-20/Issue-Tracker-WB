import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(configService: ConfigService);
    validate(payload: JwtUser): JwtUser;
}
export {};
